import os
import uuid
from coinbase.rest import RESTClient

# 1. Initialize Client via your verified JSON Key File
json_file_path = os.path.join(os.path.dirname(__file__), "coinbase_cloud_api_key.json")

try:
    client = RESTClient(
        key_file=json_file_path, 
        api_key=None, 
        api_secret=None
    )
    print("🚀 Coinbase Live Engine Initialized Successfully!\n")
    
    # ==========================================
    # MODULE 1: FETCH ACCOUNT BALANCES
    # ==========================================
    print("--- 💰 Current Wallet Balances ---")
    response = client.get_accounts()
    
    found_balance = False
    if hasattr(response, 'accounts') and response.accounts:
        for account in response.accounts:
            try:
                balance_info = account.available_balance
                currency = balance_info['currency']
                value = float(balance_info['value'])
                
                if value > 0:
                    print(f" • {currency}: {value:.6f}")
                    found_balance = True
            except (AttributeError, KeyError, TypeError):
                continue
                
    if not found_balance:
        print(" • No active balances found (All accounts are empty).")
    print("-" * 35 + "\n")

    # ==========================================
    # MODULE 2: FETCH REAL-TIME TICKER PRICE
    # ==========================================
    target_product = "BTC-USD"
    print(f"--- 📈 Real-Time Price Monitor ({target_product}) ---")
    
    # Use get_product to fetch details including real-time spot price
    product = client.get_product(product_id=target_product)
    
    try:
        current_price = product.price
    except AttributeError:
        try:
            current_price = product['price']
        except (KeyError, TypeError):
            current_price = "0.0"
        
    print(f" • Spot Price: ${float(current_price):,.2f}")
    print("-" * 35 + "\n")

    # ==========================================
    # MODULE 3: TRADING ORDER EXECUTION
    # ==========================================
    print("--- ⚡ Trading Order Execution ---")
    
    LIVE_TRADE_TRIGGER = True
    
    if LIVE_TRADE_TRIGGER:
        unique_order_id = str(uuid.uuid4()) 
        buy_amount_usd = "5.00"
        
        print(f" • Submitting LIVE Market Buy Order for ${buy_amount_usd} of {target_product}...")
        
        try:
            order = client.market_order_buy(
                client_order_id=unique_order_id,
                product_id=target_product,
                quote_size=buy_amount_usd
            )
            
            # Safely check response attributes
            if hasattr(order, 'success_response') and order.success_response:
                order_id = getattr(order.success_response, 'order_id', 'Unknown')
                print(f"✅ Order Successfully Filled! Order ID: {order_id}")
            else:
                print(f"✅ Order Submitted Successfully!")
                
        except Exception as order_err:
            print(f"❌ Order Error: {order_err}")
    else:
        print(" • Live Trading is currently [DISABLED] for safety.")
        print(" • Change 'LIVE_TRADE_TRIGGER = True' in script.py to place a real order.")
        
    print("-" * 35 + "\n")

except Exception as e:
    print(f"❌ Critical Engine Error: {e}")