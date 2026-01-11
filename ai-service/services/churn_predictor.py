import pandas as pd
import numpy as np
from datetime import datetime, timezone
import os
import joblib
from utils.feature_engineering import extract_customer_features

def load_model(model_name):
    """Load trained model or return None if not available"""
    model_path = os.path.join(os.path.dirname(__file__), '..', 'models', model_name)
    if os.path.exists(model_path):
        return joblib.load(model_path)
    return None

def predict_churn(data):
    """
    Predict customer churn and non-renewal
    Input: {
        'customers': [
            {
                'id': '...',
                'name': '...',
                'last_order_date': '...',
                'total_orders': 0,
                'total_revenue': 0,
                ...
            }
        ]
    }
    """
    customers = data.get('customers', [])
    
    # Try to load trained model
    model = load_model('churn_model.pkl')
    
    results = []
    now = datetime.now(timezone.utc)
    
    for customer in customers:
        # Rule-based churn probability
        churn_prob = 0.0
        
        # Days since last order
        last_order = customer.get('last_order_date') or customer.get('lastOrderDate')
        if last_order:
            last_order_dt = pd.to_datetime(last_order)
            if last_order_dt.tz is None:
                last_order_dt = last_order_dt.tz_localize('UTC')
            days_since_order = (now - last_order_dt).days
            if days_since_order > 180:
                churn_prob = 0.8
            elif days_since_order > 90:
                churn_prob = 0.6
            elif days_since_order > 60:
                churn_prob = 0.4
            elif days_since_order > 30:
                churn_prob = 0.2
        
        # Payment delays
        avg_payment_delay = customer.get('avg_payment_delay', 0) or customer.get('avgPaymentDelay', 0)
        if avg_payment_delay > 30:
            churn_prob = min(churn_prob + 0.3, 1.0)
        elif avg_payment_delay > 15:
            churn_prob = min(churn_prob + 0.15, 1.0)
        
        # Low order frequency
        total_orders = customer.get('total_orders', 0) or customer.get('totalOrders', 0)
        if total_orders == 0:
            churn_prob = 0.9
        elif total_orders == 1:
            churn_prob = min(churn_prob + 0.2, 1.0)
        
        # No recent interaction
        last_interaction = customer.get('last_interaction_date') or customer.get('lastInteractionDate')
        if last_interaction:
            last_interaction_dt = pd.to_datetime(last_interaction)
            if last_interaction_dt.tz is None:
                last_interaction_dt = last_interaction_dt.tz_localize('UTC')
            days_since_interaction = (now - last_interaction_dt).days
            if days_since_interaction > 90:
                churn_prob = min(churn_prob + 0.2, 1.0)
        
        # Complaints
        complaint_count = customer.get('complaint_count', 0) or customer.get('complaintCount', 0)
        if complaint_count > 2:
            churn_prob = min(churn_prob + 0.15, 1.0)
        
        # If model exists, use it for more accurate prediction
        if model:
            try:
                features_df = extract_customer_features([customer])
                if not features_df.empty:
                    ml_prob = model.predict_proba(features_df)[0][1]
                    churn_prob = (churn_prob * 0.3) + (ml_prob * 0.7)  # Blend
            except:
                pass  # Fallback to rule-based
        
        risk_level = 'High' if churn_prob > 0.7 else 'Medium' if churn_prob > 0.4 else 'Low'
        
        results.append({
            'customer_id': customer.get('id') or customer.get('_id'),
            'customer_name': customer.get('name') or customer.get('school_name') or customer.get('customerName', 'Unknown'),
            'churn_probability': round(churn_prob, 3),
            'risk_level': risk_level,
            'total_revenue': customer.get('total_revenue', 0) or customer.get('totalRevenue', 0),
            'total_orders': total_orders,
            'days_since_last_order': days_since_order if last_order else None,
            'retention_recommendations': get_retention_strategies(customer, churn_prob)
        })
    
    # Sort by churn probability (highest first)
    results.sort(key=lambda x: x['churn_probability'], reverse=True)
    
    return {
        'churn_predictions': results,
        'high_risk_count': sum(1 for r in results if r['risk_level'] == 'High'),
        'medium_risk_count': sum(1 for r in results if r['risk_level'] == 'Medium'),
        'low_risk_count': sum(1 for r in results if r['risk_level'] == 'Low'),
        'total_at_risk_revenue': sum(r['total_revenue'] for r in results if r['risk_level'] == 'High'),
        'timestamp': datetime.now(timezone.utc).isoformat()
    }

def get_retention_strategies(customer, churn_prob):
    """Get retention strategies based on churn probability"""
    strategies = []
    
    if churn_prob > 0.7:
        strategies.append('Immediate intervention required - assign dedicated account manager')
        strategies.append('Offer special discount or incentive')
        strategies.append('Schedule urgent follow-up call')
    elif churn_prob > 0.4:
        strategies.append('Increase engagement frequency')
        strategies.append('Send personalized offers')
        strategies.append('Request feedback on service')
    
    # Payment-related strategies
    avg_delay = customer.get('avg_payment_delay', 0)
    if avg_delay > 20:
        strategies.append('Review payment terms and offer flexible options')
    
    # Low engagement strategies
    total_orders = customer.get('total_orders', 0)
    if total_orders <= 1:
        strategies.append('Re-engage with new product offerings')
        strategies.append('Provide onboarding support')
    
    return strategies if strategies else ['Continue regular communication', 'Monitor engagement metrics']
