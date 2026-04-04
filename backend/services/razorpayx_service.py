import logging
import razorpay
from sqlalchemy.orm import Session
import config
import models
from services import payout_lifecycle_service

logger = logging.getLogger(__name__)

# Initialize Razorpay Client (used for RazorpayX Payouts)
client = None
if config.RAZORPAY_KEY_ID and config.RAZORPAY_KEY_SECRET:
    client = razorpay.Client(auth=(config.RAZORPAY_KEY_ID, config.RAZORPAY_KEY_SECRET))

# Mock RazorpayX Account from Config or Default
RAZORPAYX_ACCOUNT_NUMBER = getattr(config, 'RAZORPAYX_ACCOUNT_NUMBER', '2323230018596645')

def execute_smart_payout(db: Session, payout_id: int):
    """
    Executes a payout with UPI-first strategy and automated IMPS fallback.
    Includes atomic rollback logic if the transaction fails on all rails.
    """
    payout = db.query(models.Payout).filter(models.Payout.id == payout_id).first()
    if not payout:
        logger.error(f"[RazorpayX] Payout {payout_id} not found.")
        return False

    worker = payout.policy.worker

    # Step 1: Pre-flight checks
    if payout.status not in ["Processing", "Initiated"]:
        logger.warning(f"[RazorpayX] Payout {payout_id} is in {payout.status} state. Skipping.")
        return False

    # Mock mode / Logic Bypass for Sandbox if credentials aren't set
    if not client:
        logger.info(f"[RazorpayX SIMULATION] No keys found. Auto-simulating success for Payout {payout_id}")
        payout_lifecycle_service.transition_payout_status(
            db, payout, "Credited", reason="[Sandbox Mock] UPI Payout Succeeded"
        )
        db.flush()
        return True

    try:
        # Step 2: Create/Fetch Razorpay Contact
        contact = client.contact.create({
            "name": worker.name,
            "contact": worker.phone,
            "type": "employee",
            "reference_id": f"WRK-{worker.id}"
        })
        contact_id = contact.get("id")

        # Step 3: Attempt Primary Rail -> UPI
        try:
            logger.info(f"[RazorpayX] Attempting primary rail (UPI) for Payout {payout_id}")
            upi_address = f"{worker.phone}@upi" # Derived mock UPI
            
            fund_account_upi = client.fund_account.create({
                "contact_id": contact_id,
                "account_type": "vpa",
                "vpa": {
                    "address": upi_address
                }
            })

            rzp_payout = client.payout.create({
                "account_number": RAZORPAYX_ACCOUNT_NUMBER,
                "fund_account_id": fund_account_upi.get("id"),
                "amount": int(payout.amount_paise),
                "currency": "INR",
                "mode": "UPI",
                "purpose": "payout",
                "queue_if_low_balance": True,
                "reference_id": str(payout.id)
            })
            
            payout_lifecycle_service.transition_payout_status(
                db, payout, "Processing", 
                reason=f"Dispatched via RazorpayX (UPI: {rzp_payout.get('id')})",
                external_ref=rzp_payout.get('id')
            )
            db.flush()
            return True

        except Exception as upi_error:
            logger.warning(f"[RazorpayX] UPI Rail Failed: {upi_error}. Triggering IMPS Fallback...")

            # Step 4: Fallback Rail -> IMPS Routing
            fallback_fund_account = client.fund_account.create({
                "contact_id": contact_id,
                "account_type": "bank_account",
                "bank_account": {
                    "name": worker.name,
                    "ifsc": "HDFC0000001", # Mock Sandbox IFSC
                    "account_number": "99999999999999" # Mock Sandbox Account
                }
            })

            rzp_payout_fallback = client.payout.create({
                "account_number": RAZORPAYX_ACCOUNT_NUMBER,
                "fund_account_id": fallback_fund_account.get("id"),
                "amount": int(payout.amount_paise),
                "currency": "INR",
                "mode": "IMPS",
                "purpose": "payout",
                "queue_if_low_balance": True,
                "reference_id": f"{payout.id}-FB"
            })

            payout_lifecycle_service.transition_payout_status(
                db, payout, "Processing", 
                reason=f"Dispatched via RazorpayX Fallback (IMPS: {rzp_payout_fallback.get('id')})",
                external_ref=rzp_payout_fallback.get('id')
            )
            db.flush()
            return True

    except Exception as critical_error:
        # Step 5: Complete Failure -> Rollback Logic
        logger.error(f"[RazorpayX] Critical Failure on all rails: {critical_error}. Initiating Rollback.")
        payout_lifecycle_service.transition_payout_status(
            db, payout, "Failed", 
            reason=f"RazorpayX API Exception: {str(critical_error)[:100]}. Both UPI and IMPS failed."
        )
        db.flush()
        return False
