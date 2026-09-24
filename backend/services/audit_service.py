from models.enrichment import AuditEvent
from extensions import db


def audit(recording_id, event_type, actor_id=None, data=None):
    event = AuditEvent(
        recording_id=recording_id,
        event_type=event_type,
        actor_id=actor_id,
        event_data=data or {},
    )
    db.session.add(event)
    return event
