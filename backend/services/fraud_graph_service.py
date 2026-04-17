# SecureSync AI — Graph-Based Fraud Ring Detection (Phase 3)
# Bipartite graph of worker accounts, device fingerprints, and UPI payout destinations.
# Any device or UPI node connected to more than 2 worker accounts is auto-escalated.

import logging
from collections import defaultdict
from datetime import timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
import models
from utils.time_utils import utcnow

logger = logging.getLogger(__name__)


class FraudRingGraph:
    """
    Bipartite graph for fraud ring detection.

    Nodes: worker_accounts, device_fingerprints, upi_destinations
    Edges: connections between workers and their devices/UPI endpoints

    Detection: Any device or UPI node connected to >2 worker accounts
    is auto-escalated — coordinated rings are structurally visible.
    """

    def __init__(self):
        # Adjacency lists
        self.worker_to_devices = defaultdict(set)      # worker_id -> set of device_ids
        self.device_to_workers = defaultdict(set)       # device_id -> set of worker_ids
        self.worker_to_upis = defaultdict(set)          # worker_id -> set of upi_ids
        self.upi_to_workers = defaultdict(set)          # upi_id -> set of worker_ids
        self.worker_metadata = {}                        # worker_id -> metadata dict

    def add_worker(self, worker_id: int, device_fingerprint: str = None, upi_id: str = None, metadata: dict = None):
        """Register a worker's device and UPI in the graph."""
        if device_fingerprint:
            self.worker_to_devices[worker_id].add(device_fingerprint)
            self.device_to_workers[device_fingerprint].add(worker_id)

        if upi_id:
            self.worker_to_upis[worker_id].add(upi_id)
            self.upi_to_workers[upi_id].add(worker_id)

        if metadata:
            self.worker_metadata[worker_id] = metadata

    def detect_shared_devices(self, threshold: int = 2) -> list[dict]:
        """
        Find devices connected to more than `threshold` worker accounts.
        Returns list of suspicious device clusters.
        """
        suspicious = []
        for device_id, workers in self.device_to_workers.items():
            if len(workers) > threshold:
                suspicious.append({
                    "type": "shared_device",
                    "device_fingerprint": device_id,
                    "connected_workers": list(workers),
                    "worker_count": len(workers),
                    "risk_level": "HIGH" if len(workers) > 3 else "MEDIUM",
                    "reason": f"Device {device_id[:8]}... shared across {len(workers)} accounts",
                })
        return suspicious

    def detect_shared_upis(self, threshold: int = 2) -> list[dict]:
        """
        Find UPI destinations connected to more than `threshold` worker accounts.
        Returns list of suspicious UPI clusters.
        """
        suspicious = []
        for upi_id, workers in self.upi_to_workers.items():
            if len(workers) > threshold:
                suspicious.append({
                    "type": "shared_upi",
                    "upi_id": upi_id,
                    "connected_workers": list(workers),
                    "worker_count": len(workers),
                    "risk_level": "HIGH" if len(workers) > 3 else "MEDIUM",
                    "reason": f"UPI {upi_id} receives payouts for {len(workers)} accounts",
                })
        return suspicious

    def detect_fraud_rings(self, threshold: int = 2) -> list[dict]:
        """
        Detect fraud rings by finding connected components in the bipartite graph
        where shared devices/UPIs link multiple workers.
        """
        # Build adjacency for workers via shared devices and UPIs
        worker_connections = defaultdict(set)

        # Workers sharing a device
        for device_id, workers in self.device_to_workers.items():
            if len(workers) > 1:
                worker_list = list(workers)
                for i in range(len(worker_list)):
                    for j in range(i + 1, len(worker_list)):
                        worker_connections[worker_list[i]].add(worker_list[j])
                        worker_connections[worker_list[j]].add(worker_list[i])

        # Workers sharing a UPI
        for upi_id, workers in self.upi_to_workers.items():
            if len(workers) > 1:
                worker_list = list(workers)
                for i in range(len(worker_list)):
                    for j in range(i + 1, len(worker_list)):
                        worker_connections[worker_list[i]].add(worker_list[j])
                        worker_connections[worker_list[j]].add(worker_list[i])

        # Find connected components (fraud rings)
        visited = set()
        rings = []

        for worker_id in worker_connections:
            if worker_id in visited:
                continue

            # BFS to find connected component
            ring = set()
            queue = [worker_id]
            while queue:
                current = queue.pop(0)
                if current in visited:
                    continue
                visited.add(current)
                ring.add(current)
                for neighbor in worker_connections[current]:
                    if neighbor not in visited:
                        queue.append(neighbor)

            if len(ring) >= threshold:
                # Identify shared resources
                shared_devices = set()
                shared_upis = set()
                for wid in ring:
                    for dev in self.worker_to_devices.get(wid, set()):
                        if len(self.device_to_workers.get(dev, set()) & ring) > 1:
                            shared_devices.add(dev)
                    for upi in self.worker_to_upis.get(wid, set()):
                        if len(self.upi_to_workers.get(upi, set()) & ring) > 1:
                            shared_upis.add(upi)

                rings.append({
                    "type": "fraud_ring",
                    "worker_ids": list(ring),
                    "ring_size": len(ring),
                    "shared_devices": list(shared_devices),
                    "shared_upis": list(shared_upis),
                    "risk_level": "CRITICAL" if len(ring) > 4 else "HIGH",
                    "reason": f"Fraud ring detected: {len(ring)} accounts connected via {len(shared_devices)} devices and {len(shared_upis)} UPIs",
                })

        return rings

    def get_worker_risk(self, worker_id: int) -> dict:
        """Get fraud ring risk assessment for a specific worker."""
        risk = {
            "worker_id": worker_id,
            "in_ring": False,
            "ring_risk_score": 0.0,
            "shared_device_count": 0,
            "shared_upi_count": 0,
            "flags": [],
        }

        # Check device sharing
        for device in self.worker_to_devices.get(worker_id, set()):
            connected = self.device_to_workers.get(device, set())
            if len(connected) > 1:
                risk["shared_device_count"] = len(connected) - 1
                risk["flags"].append(f"Device shared with {len(connected) - 1} other accounts")

        # Check UPI sharing
        for upi in self.worker_to_upis.get(worker_id, set()):
            connected = self.upi_to_workers.get(upi, set())
            if len(connected) > 1:
                risk["shared_upi_count"] = len(connected) - 1
                risk["flags"].append(f"UPI destination shared with {len(connected) - 1} other accounts")

        # Calculate risk score
        if risk["shared_device_count"] > 0 or risk["shared_upi_count"] > 0:
            risk["in_ring"] = True
            risk["ring_risk_score"] = min(
                0.3 * risk["shared_device_count"] + 0.4 * risk["shared_upi_count"],
                1.0,
            )

        return risk

    def get_graph_stats(self) -> dict:
        """Get summary statistics of the fraud graph."""
        total_workers = len(set(
            list(self.worker_to_devices.keys()) + list(self.worker_to_upis.keys())
        ))
        total_devices = len(self.device_to_workers)
        total_upis = len(self.upi_to_workers)

        shared_devices = sum(1 for workers in self.device_to_workers.values() if len(workers) > 1)
        shared_upis = sum(1 for workers in self.upi_to_workers.values() if len(workers) > 1)

        rings = self.detect_fraud_rings()

        return {
            "total_workers": total_workers,
            "total_devices": total_devices,
            "total_upis": total_upis,
            "shared_devices": shared_devices,
            "shared_upis": shared_upis,
            "fraud_rings_detected": len(rings),
            "workers_in_rings": sum(r["ring_size"] for r in rings),
            "rings": rings,
        }


# ═══════════════════════════════════════════
# Singleton Instance
# ═══════════════════════════════════════════

_fraud_graph = FraudRingGraph()


def get_fraud_graph() -> FraudRingGraph:
    """Get the global fraud ring graph instance."""
    return _fraud_graph


def build_graph_from_db(db: Session):
    """
    Build the fraud graph from existing database records.
    Called at startup and periodically.
    """
    global _fraud_graph
    _fraud_graph = FraudRingGraph()

    workers = db.query(models.Worker).all()
    for worker in workers:
        # Use partner_id as a proxy for device fingerprint (demo)
        device_fp = f"DEV-{worker.partner_id or worker.id}"
        # Use a generated UPI ID based on phone
        upi_id = f"upi-{worker.phone or worker.id}@securesync"

        _fraud_graph.add_worker(
            worker_id=worker.id,
            device_fingerprint=device_fp,
            upi_id=upi_id,
            metadata={
                "name": worker.name,
                "zone": worker.zone,
                "partner_id": worker.partner_id,
            },
        )

    logger.info("[FraudGraph] Built graph with %d workers", len(workers))
    return _fraud_graph


def check_worker_fraud_ring(worker_id: int) -> dict:
    """Quick check if a worker is part of a fraud ring."""
    return _fraud_graph.get_worker_risk(worker_id)
