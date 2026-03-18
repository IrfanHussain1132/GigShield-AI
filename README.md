<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GigShield AI</title>

    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            background: #f5f7fa;
            color: #333;
        }

        header {
            background: #1e293b;
            color: white;
            padding: 30px;
            text-align: center;
        }

        h1 {
            margin: 0;
        }

        section {
            padding: 25px;
            margin: 20px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }

        h2 {
            color: #2563eb;
        }

        ul {
            line-height: 1.8;
        }

        .highlight {
            background: #e0f2fe;
            padding: 12px;
            border-left: 5px solid #0284c7;
            margin-top: 10px;
            font-weight: bold;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }

        table, th, td {
            border: 1px solid #ddd;
        }

        th, td {
            padding: 10px;
            text-align: center;
        }

        th {
            background: #2563eb;
            color: white;
        }

        footer {
            text-align: center;
            padding: 20px;
            background: #1e293b;
            color: white;
            margin-top: 20px;
        }
    </style>
</head>

<body>

<header>
    <h1>🚀 GigShield AI</h1>
    <p>AI-Powered Parametric Insurance for Food Delivery Partners</p>
</header>

<section>
    <h2>📌 Problem Statement</h2>
    <p>
        Food delivery partners face income loss due to weather conditions,
        pollution, and social disruptions like curfews. They currently have no
        financial protection against such unpredictable events.
    </p>
</section>

<section>
    <h2>💡 Solution</h2>
    <p>
        GigShield AI provides automatic compensation for income loss using
        AI and real-time APIs. No manual claims are required — everything is
        detected and processed automatically.
    </p>
</section>

<section>
    <h2>👤 Target Users</h2>
    <ul>
        <li>Swiggy / Zomato delivery partners</li>
        <li>Urban & semi-urban gig workers</li>
        <li>Workers earning weekly income</li>
    </ul>
</section>

<section>
    <h2>⚙️ Workflow</h2>
    <ul>
        <li>User signs up and provides location & income</li>
        <li>AI calculates risk score & weekly premium</li>
        <li>System monitors weather, maps, and news APIs</li>
        <li>Disruption detected automatically</li>
        <li>Income loss calculated</li>
        <li>Instant payout triggered 💸</li>
    </ul>
</section>

<section>
    <h2>💰 Compensation Model</h2>
    <div class="highlight">
        Compensation = Avg Hourly Income × Hours Lost
    </div>
</section>

<section>
    <h2>💸 Weekly Premium Model</h2>
    <p>
        Premium is calculated weekly based on risk level, location, and expected disruptions.
    </p>
    <ul>
        <li>Example Weekly Income: ₹5000</li>
        <li>Premium: ₹100/week</li>
    </ul>
</section>

<section>
    <h2>⚡ Parametric Triggers</h2>

    <table>
        <tr>
            <th>Type</th>
            <th>Condition</th>
            <th>Impact</th>
        </tr>
        <tr>
            <td>🌧️ Rain</td>
            <td>> 50mm</td>
            <td>Delivery slowdown</td>
        </tr>
        <tr>
            <td>🌡️ Heat</td>
            <td>> 42°C</td>
            <td>Unsafe working</td>
        </tr>
        <tr>
            <td>🌫️ Pollution</td>
            <td>AQI > 300</td>
            <td>Reduced work</td>
        </tr>
        <tr>
            <td>🚫 Social</td>
            <td>Curfew / Strike</td>
            <td>No deliveries</td>
        </tr>
    </table>

</section>

<section>
    <h2>🤖 AI Features</h2>
    <ul>
        <li>Risk prediction model</li>
        <li>Dynamic premium calculation</li>
        <li>Fraud detection (location + behavior)</li>
    </ul>
</section>

<section>
    <h2>🔗 APIs Used</h2>
    <ul>
        <li>Weather API (OpenWeatherMap)</li>
        <li>Google Maps API</li>
        <li>News API</li>
        <li>Air Quality API (optional)</li>
    </ul>
</section>

<!-- NEW TECH STACK -->
<section>
    <h2>🛠️ Tech Stack</h2>
    <ul>
        <li><b>Frontend:</b> React.js (Mobile-first UI)</li>
        <li><b>Backend:</b> Node.js + Express</li>
        <li><b>Database:</b> PostgreSQL / MongoDB</li>
        <li><b>AI/ML Service:</b> Python (Flask + Scikit-learn)</li>
        <li><b>Payments:</b> Razorpay</li>
        <li><b>Deployment:</b> Docker (Microservices)</li>
    </ul>
</section>

<!-- NEW ARCHITECTURE -->
<section>
    <h2>🏗️ System Architecture</h2>

    <p>
        GigShield AI is built using a <b>microservices architecture</b> where each service 
        runs independently and communicates through APIs.
    </p>

    <ul>
        <li><b>Frontend:</b> User interface and dashboard</li>
        <li><b>Backend:</b> Core logic, API handling, trigger monitoring</li>
        <li><b>ML Service:</b> Risk scoring and fraud detection</li>
        <li><b>Database:</b> Stores users, policies, and claims</li>
        <li><b>External APIs:</b> Weather, Maps, News</li>
    </ul>

    <div class="highlight">
        Flow: APIs → Backend → ML Service → Database → Payout
    </div>

    <p>
        The backend continuously monitors APIs. When a disruption occurs, the system 
        automatically calculates loss and triggers instant payout.
    </p>
</section>

<section>
    <h2>📊 Dashboard</h2>
    <ul>
        <li>Active users</li>
        <li>Premium collected</li>
        <li>Claims triggered</li>
        <li>Payouts processed</li>
    </ul>
</section>

<section>
    <h2>📱 Platform</h2>
    <p>Mobile-first application for delivery partners.</p>
</section>

<section>
    <h2>🚀 Future Enhancements</h2>
    <ul>
        <li>Heatwave prediction</li>
        <li>Risk alerts</li>
        <li>Platform integrations</li>
    </ul>
</section>

<footer>
    <p>© 2026 GigShield AI | Built for Gig Workers ❤️</p>
</footer>

</body>
</html>
