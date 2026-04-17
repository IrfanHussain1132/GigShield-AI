import os
import razorpay
import uuid
from dotenv import load_dotenv

# Load .env
load_dotenv()

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")

def simulate_razorpay_order():
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        print("[ERROR] RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not found in .env")
        return

    print(f"[INFO] Starting Razorpay simulation with Key ID: {RAZORPAY_KEY_ID[:8]}...")

    try:
        # Initialize client
        client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        
        receipt_id = f"test_sim_{uuid.uuid4().hex[:8]}"
        order_amount = 4900  # Rs 49.00
        
        print(f"[INFO] Creating test order for amount {order_amount} paise...")
        
        order = client.order.create({
            "amount": order_amount,
            "currency": "INR",
            "receipt": receipt_id,
            "notes": {
                "simulation": "true",
                "purpose": "API Key Verification"
            }
        })
        
        print("\n[SUCCESS] Simulation Success!")
        print(f" - Order ID: {order['id']}")
        print(f" - Status: {order['status']}")
        print(f" - Receipt: {order['receipt']}")
        print("\nYour Razorpay Test Keys are working correctly.")
        
    except Exception as e:
        print(f"[ERROR] Simulation Failed: {str(e)}")

if __name__ == "__main__":
    simulate_razorpay_order()
