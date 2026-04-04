# SecureSync AI — ML Service (Phase 3)
# Isolation Forest fraud detection + LSTM 72-hr predictive forecast
# Models are trained on synthetic data at startup and cached in memory.

import numpy as np
import logging
import os
import json
import math
from datetime import datetime, timedelta
from utils.time_utils import utcnow

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════
# Isolation Forest — Anomaly-Based Fraud Detection
# ═══════════════════════════════════════════

_isolation_forest_model = None
_iforest_scaler = None
_IFOREST_FEATURES = [
    "claim_frequency_7d",       # Claims in last 7 days
    "claim_frequency_30d",      # Claims in last 30 days
    "avg_claim_amount_paise",   # Average claim amount
    "tenure_months",            # Account tenure
    "zone_consistency_score",   # How consistent is their zone
    "device_uniqueness",        # Is device shared with other accounts (0/1)
    "claim_timing_variance",    # Std dev of claim times (seconds)
    "peer_claim_ratio",         # Claims vs zone peers
    "payout_to_income_ratio",   # Weekly payout / weekly income
    "speed_anomaly_score",      # GPS speed anomaly metric
    "platform_activity_score",  # Delivery activity during claimed disruption
    "registration_age_days",    # Days since registration
]


class SimpleScaler:
    """Min-max scaler that learns from training data."""
    def __init__(self):
        self.min_vals = None
        self.max_vals = None
        self.fitted = False

    def fit(self, X):
        self.min_vals = np.min(X, axis=0)
        self.max_vals = np.max(X, axis=0)
        self.fitted = True
        return self

    def transform(self, X):
        if not self.fitted:
            return X
        ranges = self.max_vals - self.min_vals
        ranges[ranges == 0] = 1.0
        return (X - self.min_vals) / ranges

    def to_dict(self):
        return {
            "min_vals": self.min_vals.tolist() if self.min_vals is not None else None,
            "max_vals": self.max_vals.tolist() if self.max_vals is not None else None,
            "fitted": self.fitted
        }

    @classmethod
    def from_dict(cls, data):
        scaler = cls()
        scaler.min_vals = np.array(data["min_vals"]) if data.get("min_vals") else None
        scaler.max_vals = np.array(data["max_vals"]) if data.get("max_vals") else None
        scaler.fitted = data.get("fitted", False)
        return scaler


class SimpleIsolationTree:
    """Single isolation tree for the forest."""
    def __init__(self, max_depth=10):
        self.max_depth = max_depth
        self.tree = None

    def fit(self, X, depth=0):
        n_samples, n_features = X.shape
        if depth >= self.max_depth or n_samples <= 1:
            return {"type": "leaf", "size": n_samples}

        feature = np.random.randint(0, n_features)
        min_val = X[:, feature].min()
        max_val = X[:, feature].max()

        if min_val == max_val:
            return {"type": "leaf", "size": n_samples}

        split_val = np.random.uniform(min_val, max_val)
        left_mask = X[:, feature] < split_val
        right_mask = ~left_mask

        return {
            "type": "split",
            "feature": feature,
            "split_value": split_val,
            "left": self.fit(X[left_mask], depth + 1),
            "right": self.fit(X[right_mask], depth + 1),
        }

    def path_length(self, x, node=None, depth=0):
        if node is None:
            node = self.tree
        if node["type"] == "leaf":
            n = node["size"]
            if n <= 1:
                return depth
            # Average path length of unsuccessful search in BST
            return depth + _c(n)
        if x[node["feature"]] < node["split_value"]:
            return self.path_length(x, node["left"], depth + 1)
        return self.path_length(x, node["right"], depth + 1)


def _c(n):
    """Average path length of unsuccessful search in BST."""
    if n <= 1:
        return 0
    return 2.0 * (math.log(n - 1) + 0.5772156649) - (2.0 * (n - 1) / n)


class SimpleIsolationForest:
    """Lightweight Isolation Forest implementation for fraud detection."""
    def __init__(self, n_estimators=100, max_samples=256, max_depth=10, contamination=0.1):
        self.n_estimators = n_estimators
        self.max_samples = max_samples
        self.max_depth = max_depth
        self.contamination = contamination
        self.trees = []
        self.threshold = None
        self._n_samples = 0

    def fit(self, X):
        self._n_samples = X.shape[0]
        self.trees = []
        for _ in range(self.n_estimators):
            sample_size = min(self.max_samples, X.shape[0])
            indices = np.random.choice(X.shape[0], sample_size, replace=False)
            tree = SimpleIsolationTree(max_depth=self.max_depth)
            tree.tree = tree.fit(X[indices])
            self.trees.append(tree)

        # Compute threshold based on contamination
        scores = self.decision_function(X)
        self.threshold = np.percentile(scores, self.contamination * 100)
        return self

    def decision_function(self, X: np.ndarray) -> np.ndarray:
        """Return anomaly scores. Higher = more anomalous."""
        if not self.trees:
            return np.zeros(X.shape[0])

        path_lengths = np.array([[tree.path_length(x) for x in X] for tree in self.trees])
        avg_path_lengths = path_lengths.mean(axis=0)

        c_n = _c(self.max_samples)
        if c_n == 0:
            return np.zeros(X.shape[0])

        # Anomaly score: 2^(-avg_path_length / c(n))
        scores = np.power(2, -avg_path_lengths / c_n)
        return scores

    def predict(self, X):
        """Return 1 for normal, -1 for anomaly."""
        scores = self.decision_function(X)
        if self.threshold is None:
            return np.ones(X.shape[0])
        return np.where(scores >= self.threshold, -1, 1)

    def score_sample(self, x):
        """Score a single sample. Returns (anomaly_score, is_anomaly)."""
        X = np.array([x])
        score = self.decision_function(X)[0]
        is_anomaly = score >= (self.threshold or 0.6)
        return float(score), is_anomaly

    def to_dict(self):
        """Serialize the forest to a dict."""
        return {
            "n_estimators": self.n_estimators,
            "max_samples": self.max_samples,
            "max_depth": self.max_depth,
            "contamination": self.contamination,
            "threshold": self.threshold,
            "trees": [t.tree for t in self.trees]
        }

    @classmethod
    def from_dict(cls, data):
        """Deserialize from a dict."""
        forest = cls(
            n_estimators=data["n_estimators"],
            max_samples=data["max_samples"],
            max_depth=data["max_depth"],
            contamination=data["contamination"]
        )
        forest.threshold = data["threshold"]
        for tree_data in data["trees"]:
            tree = SimpleIsolationTree(max_depth=forest.max_depth)
            tree.tree = tree_data
            forest.trees.append(tree)
        return forest


def _generate_synthetic_training_data(n_normal=500, n_fraud=50):
    """Generate synthetic fraud feature data for training."""
    np.random.seed(42)

    # Normal workers
    normal = np.column_stack([
        np.random.poisson(1.5, n_normal),          # claim_frequency_7d
        np.random.poisson(5, n_normal),             # claim_frequency_30d
        np.random.normal(35000, 8000, n_normal),    # avg_claim_amount_paise
        np.random.exponential(18, n_normal),        # tenure_months
        np.random.beta(8, 2, n_normal),             # zone_consistency_score
        np.zeros(n_normal),                          # device_uniqueness
        np.random.normal(14400, 3600, n_normal),    # claim_timing_variance
        np.random.normal(1.0, 0.3, n_normal),       # peer_claim_ratio
        np.random.beta(3, 7, n_normal),             # payout_to_income_ratio
        np.random.exponential(0.05, n_normal),      # speed_anomaly_score
        np.random.beta(7, 3, n_normal),             # platform_activity_score
        np.random.exponential(180, n_normal),        # registration_age_days
    ])

    # Fraudulent patterns
    fraud = np.column_stack([
        np.random.poisson(5, n_fraud),              # High claim frequency
        np.random.poisson(15, n_fraud),             # Very high 30d claims
        np.random.normal(60000, 10000, n_fraud),    # Higher amounts
        np.random.exponential(3, n_fraud),          # Short tenure
        np.random.beta(2, 8, n_fraud),              # Low zone consistency
        np.random.binomial(1, 0.6, n_fraud),        # Shared devices
        np.random.normal(3600, 1200, n_fraud),      # Low timing variance (coordinated)
        np.random.normal(3.0, 1.0, n_fraud),        # High peer ratio
        np.random.beta(7, 3, n_fraud),              # High payout ratio
        np.random.exponential(0.5, n_fraud),        # Speed anomalies
        np.random.beta(2, 8, n_fraud),              # Low platform activity
        np.random.exponential(30, n_fraud),          # Short registration
    ])

    X = np.vstack([normal, fraud])
    # Clip all values to be non-negative
    X = np.clip(X, 0, None)
    return X


def init_isolation_forest():
    """Initialize and train the Isolation Forest model."""
    global _isolation_forest_model, _iforest_scaler
    model_path = os.path.join(os.path.dirname(__file__), "..", "static", "iforest_model.json")
    
    try:
        if os.path.exists(model_path):
            logger.info("[ML] Loading Isolation Forest from disk: %s", model_path)
            with open(model_path, "r") as f:
                data = json.load(f)
                _iforest_scaler = SimpleScaler.from_dict(data["scaler"])
                _isolation_forest_model = SimpleIsolationForest.from_dict(data["model"])
            logger.info("[ML] Isolation Forest loaded successfully")
            return

        logger.info("[ML] No model found on disk. Training on synthetic fraud data...")
        X = _generate_synthetic_training_data()
        _iforest_scaler = SimpleScaler()
        _iforest_scaler.fit(X)
        X_scaled = _iforest_scaler.transform(X)

        _isolation_forest_model = SimpleIsolationForest(
            n_estimators=100,
            max_samples=256,
            max_depth=10,
            contamination=0.1,
        )
        _isolation_forest_model.fit(X_scaled)
        
        # Try to save for next time
        try:
            os.makedirs(os.path.dirname(model_path), exist_ok=True)
            with open(model_path, "w") as f:
                json.dump({
                    "scaler": _iforest_scaler.to_dict(),
                    "model": _isolation_forest_model.to_dict()
                }, f)
            logger.info("[ML] Isolation Forest saved to disk")
        except Exception as save_err:
            logger.warning("[ML] Could not save model to disk: %s", save_err)
            
        logger.info("[ML] Isolation Forest ready — %d trees, %d features", 100, len(_IFOREST_FEATURES))
    except Exception as e:
        logger.error("[ML] Isolation Forest initialization failed: %s", e)


def score_fraud_ml(features: dict) -> tuple[float, bool, str]:
    """
    Score a claim using Isolation Forest.

    Args:
        features: dict with keys matching _IFOREST_FEATURES

    Returns:
        (anomaly_score: 0.0–1.0, is_anomaly: bool, explanation: str)
    """
    if _isolation_forest_model is None:
        return 0.0, False, "ML model not loaded"

    feature_vector = np.array([
        features.get("claim_frequency_7d", 0),
        features.get("claim_frequency_30d", 0),
        features.get("avg_claim_amount_paise", 30000),
        features.get("tenure_months", 12),
        features.get("zone_consistency_score", 0.8),
        features.get("device_uniqueness", 0),
        features.get("claim_timing_variance", 14400),
        features.get("peer_claim_ratio", 1.0),
        features.get("payout_to_income_ratio", 0.3),
        features.get("speed_anomaly_score", 0.0),
        features.get("platform_activity_score", 0.7),
        features.get("registration_age_days", 90),
    ])

    scaled = _iforest_scaler.transform(feature_vector.reshape(1, -1))[0]
    anomaly_score, is_anomaly = _isolation_forest_model.score_sample(scaled)

    # Generate explanation
    high_risk_features = []
    if features.get("claim_frequency_7d", 0) > 4:
        high_risk_features.append("high claim frequency")
    if features.get("payout_to_income_ratio", 0) > 0.6:
        high_risk_features.append("high payout-to-income ratio")
    if features.get("zone_consistency_score", 1) < 0.3:
        high_risk_features.append("low zone consistency")
    if features.get("speed_anomaly_score", 0) > 0.3:
        high_risk_features.append("GPS speed anomaly")
    if features.get("platform_activity_score", 1) < 0.3:
        high_risk_features.append("low platform activity")

    if high_risk_features:
        explanation = f"ML anomaly score {anomaly_score:.2f}: " + ", ".join(high_risk_features)
    else:
        explanation = f"ML anomaly score {anomaly_score:.2f}: no significant risk signals"

    return anomaly_score, is_anomaly, explanation


# ═══════════════════════════════════════════
# LSTM 72-Hour Predictive Risk Forecast
# ═══════════════════════════════════════════
# Phase 3: Simplified LSTM-like forecast using statistical methods
# (No TensorFlow dependency needed — runs on any server)

_zone_forecast_cache = {}
_FORECAST_CACHE_TTL = 1800  # 30 minutes


class SimpleLSTMForecast:
    """
    Statistical time-series forecast that mimics LSTM behavior.
    Uses exponential smoothing + seasonal decomposition for 72-hr predictions.
    Runs without TensorFlow — suitable for competition demo.
    """
    def __init__(self, zone_config: dict):
        self.zone_config = zone_config
        self._seasonal_patterns = self._build_seasonal_patterns()

    def _build_seasonal_patterns(self):
        """Build hourly seasonal patterns for each disruption type."""
        patterns = {}
        # Rain peaks: early morning + late afternoon
        patterns["rain"] = [
            0.2, 0.15, 0.1, 0.08, 0.1, 0.15,  # 0-5
            0.2, 0.25, 0.3, 0.35, 0.4, 0.45,    # 6-11
            0.5, 0.55, 0.6, 0.65, 0.7, 0.75,    # 12-17
            0.7, 0.6, 0.5, 0.4, 0.35, 0.25,      # 18-23
        ]
        # Temperature peaks: mid-afternoon
        patterns["temp"] = [
            0.3, 0.28, 0.25, 0.23, 0.25, 0.3,
            0.35, 0.45, 0.55, 0.65, 0.75, 0.82,
            0.88, 0.95, 1.0, 0.98, 0.92, 0.85,
            0.75, 0.65, 0.55, 0.48, 0.4, 0.35,
        ]
        # AQI: worst in morning + evening (rush hour + inversion)
        patterns["aqi"] = [
            0.6, 0.55, 0.5, 0.45, 0.5, 0.6,
            0.75, 0.85, 0.9, 0.8, 0.7, 0.55,
            0.45, 0.4, 0.42, 0.5, 0.6, 0.75,
            0.85, 0.9, 0.85, 0.8, 0.7, 0.65,
        ]
        # Fog: early morning
        patterns["fog"] = [
            0.8, 0.85, 0.9, 0.95, 1.0, 0.95,
            0.85, 0.7, 0.5, 0.3, 0.15, 0.1,
            0.08, 0.05, 0.05, 0.05, 0.08, 0.15,
            0.25, 0.35, 0.45, 0.55, 0.65, 0.75,
        ]
        return patterns

    def forecast(self, current_data: dict, hours: int = 72) -> list[dict]:
        """
        Generate hourly risk forecast for next `hours` hours.

        Returns list of {hour, timestamp, rain_prob, temp_risk, aqi_risk, fog_risk, overall_risk, alert_level}
        """
        now = datetime.now()
        current_hour = now.hour
        forecasts = []

        # Base risk levels from current data
        base_rain = min(current_data.get("rain_mm", 0) / 64.5, 1.0)
        base_temp = min(max(current_data.get("temp_c", 30) - 35, 0) / 10.0, 1.0)
        base_aqi = min(current_data.get("aqi", 80) / 400.0, 1.0)
        base_fog = min(max(10000 - current_data.get("visibility_m", 10000), 0) / 10000.0, 1.0)

        for h in range(hours):
            target_hour = (current_hour + h) % 24
            day_offset = (current_hour + h) // 24

            # Apply seasonal patterns with exponential decay from current state
            decay = math.exp(-0.03 * h)  # Decay towards climatology
            trend_noise = np.random.normal(0, 0.05)

            rain_risk = (base_rain * decay + self._seasonal_patterns["rain"][target_hour] * (1 - decay)) + trend_noise
            temp_risk = (base_temp * decay + self._seasonal_patterns["temp"][target_hour] * (1 - decay)) + trend_noise * 0.5
            aqi_risk = (base_aqi * decay + self._seasonal_patterns["aqi"][target_hour] * (1 - decay)) + trend_noise * 0.3
            fog_risk = (base_fog * decay + self._seasonal_patterns["fog"][target_hour] * (1 - decay)) + trend_noise * 0.4

            # Clamp
            rain_risk = max(0, min(1, rain_risk))
            temp_risk = max(0, min(1, temp_risk))
            aqi_risk = max(0, min(1, aqi_risk))
            fog_risk = max(0, min(1, fog_risk))

            overall = rain_risk * 0.4 + temp_risk * 0.2 + aqi_risk * 0.25 + fog_risk * 0.15

            if overall >= 0.7:
                alert = "RED"
            elif overall >= 0.45:
                alert = "ORANGE"
            elif overall >= 0.2:
                alert = "YELLOW"
            else:
                alert = "GREEN"

            target_time = now + timedelta(hours=h)

            forecasts.append({
                "hour_offset": h,
                "timestamp": target_time.strftime("%Y-%m-%dT%H:00"),
                "hour_label": target_time.strftime("%I %p"),
                "day_label": ["Today", "Tomorrow", "Day 3"][min(day_offset, 2)],
                "rain_probability": round(rain_risk * 100),
                "temp_risk": round(temp_risk * 100),
                "aqi_risk": round(aqi_risk * 100),
                "fog_risk": round(fog_risk * 100),
                "overall_risk": round(overall * 100),
                "alert_level": alert,
                "breach_probability": round(overall * 100),
            })

        return forecasts


_forecasters = {}


def get_72hr_forecast(zone: str, current_data: dict) -> list[dict]:
    """Get 72-hour forecast for a zone. Cached for 30 minutes."""
    import config as cfg
    cache_key = f"{zone}_{datetime.now().strftime('%Y%m%d%H')}"

    if cache_key in _zone_forecast_cache:
        cached = _zone_forecast_cache[cache_key]
        if (datetime.now().timestamp() - cached["ts"]) < _FORECAST_CACHE_TTL:
            return cached["data"]

    zone_config = cfg.ZONES.get(zone, {})
    if zone not in _forecasters:
        _forecasters[zone] = SimpleLSTMForecast(zone_config)

    forecasts = _forecasters[zone].forecast(current_data, hours=72)
    _zone_forecast_cache[cache_key] = {"data": forecasts, "ts": datetime.now().timestamp()}
    return forecasts


def get_forecast_summary(zone: str, current_data: dict) -> dict:
    """Get a high-level summary of the 72-hour forecast."""
    forecasts = get_72hr_forecast(zone, current_data)

    # Next 6 hours
    next_6 = forecasts[:6]
    # Next 24 hours
    next_24 = forecasts[:24]
    # Full 72 hours
    all_72 = forecasts

    max_risk_6h = max(f["overall_risk"] for f in next_6)
    max_risk_24h = max(f["overall_risk"] for f in next_24)
    max_risk_72h = max(f["overall_risk"] for f in all_72)

    # Find the highest risk period
    peak_hour = max(all_72, key=lambda f: f["overall_risk"])

    # Count RED/ORANGE hours
    red_hours = sum(1 for f in all_72 if f["alert_level"] == "RED")
    orange_hours = sum(1 for f in all_72 if f["alert_level"] == "ORANGE")

    # Generate prediction message
    if max_risk_6h >= 70:
        message = f"⚠️ High disruption risk in your zone within 6 hours. Your coverage is watching."
    elif max_risk_24h >= 70:
        message = f"🌧️ Disruption likely tomorrow. Stay covered."
    elif max_risk_72h >= 60:
        message = f"📊 Moderate risk detected in the 3-day outlook."
    else:
        message = "✅ Low disruption risk for the next 72 hours."

    return {
        "max_risk_6h": max_risk_6h,
        "max_risk_24h": max_risk_24h,
        "max_risk_72h": max_risk_72h,
        "peak_hour": peak_hour,
        "red_hours": red_hours,
        "orange_hours": orange_hours,
        "message": message,
        "next_6h": next_6,
        "hourly_forecast": forecasts,
    }


# ═══════════════════════════════════════════
# Startup Initialization
# ═══════════════════════════════════════════

def init_ml_models():
    """Initialize all ML models at application startup."""
    init_isolation_forest()
    logger.info("[ML] All Phase 3 ML models initialized")
