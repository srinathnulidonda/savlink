# server/app/models/subscription.py
from datetime import datetime
from app.extensions import db


class Subscription(db.Model):
    __tablename__ = 'subscriptions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Text, db.ForeignKey('users.id'), unique=True, nullable=False, index=True)
    plan_id = db.Column(db.String(20), nullable=False, default='free')
    status = db.Column(db.String(20), nullable=False, default='active')
    stripe_customer_id = db.Column(db.String(255), nullable=True)
    stripe_subscription_id = db.Column(db.String(255), nullable=True)
    current_period_start = db.Column(db.DateTime, nullable=True)
    current_period_end = db.Column(db.DateTime, nullable=True)
    cancel_at_period_end = db.Column(db.Boolean, default=False)
    short_links_this_month = db.Column(db.Integer, default=0, nullable=False)
    month_reset_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('subscription', uselist=False))

    def is_active(self) -> bool:
        if self.plan_id == 'free':
            return True
        if self.status != 'active':
            return False
        if self.current_period_end and datetime.utcnow() > self.current_period_end:
            return False
        return True

    def to_dict(self):
        from app.billing.plans import get_plan
        plan = get_plan(self.plan_id)
        return {
            'plan_id': self.plan_id,
            'plan_name': plan['name'],
            'status': self.status,
            'is_active': self.is_active(),
            'cancel_at_period_end': self.cancel_at_period_end,
            'current_period_end': self.current_period_end.isoformat() if self.current_period_end else None,
            'short_links_used': self.short_links_this_month,
            'short_links_limit': plan['limits']['short_links_per_month'],
            'limits': plan['limits'],
            'features': plan['features'],
        }