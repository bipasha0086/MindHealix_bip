"""
Seed script for YouTube Guard demo data.
Populates MongoDB with realistic test data for dashboards and history.
"""

from datetime import datetime, timedelta
import random
from pymongo import MongoClient

# MongoDB connection
MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "mental_health_db"

# Sample data
CHANNELS = [
    "Mental Health Daily",
    "Anxiety & Stress Relief",
    "Depression Support Group",
    "Mindfulness & Meditation",
    "Positive Psychology Hub",
    "Wellness Coaching",
    "Self-Care Series",
    "Crisis Resource Center",
]

LOW_RISK_TITLES = [
    "5-Minute Breathing Exercise for Anxiety",
    "Mindfulness Meditation for Beginners",
    "How to Build Healthy Habits",
    "Yoga for Relaxation",
    "Daily Affirmations for Positivity",
    "Progressive Muscle Relaxation",
    "Sleep Meditation Guide",
    "Gratitude Practice Tutorial",
]

MEDIUM_RISK_TITLES = [
    "Understanding Depression: A Deep Dive",
    "Anxiety Disorders Explained",
    "Coping with Stress at Work",
    "Managing Panic Attacks",
    "Dealing with Loneliness",
    "Overcoming Social Anxiety",
    "Understanding PTSD",
    "Life After Loss: Grief Support",
]

HIGH_RISK_TITLES = [
    "Dark Thoughts: Why Nobody Cares",
    "Suicidal Ideation Support Forum",
    "Living with Severe Depression",
    "Self-Harm Warning Signs",
    "Crisis: When Hope Disappears",
    "End of Life Discussions",
    "Hopelessness and Despair",
    "Extreme Anxiety Spirals",
]

DESCRIPTIONS = {
    "low": "A helpful guide on managing wellness and self-care techniques for daily life.",
    "medium": "An educational video discussing mental health challenges and coping strategies.",
    "high": "A concerning video with potentially harmful content related to mental health crises.",
}


def generate_activity_records(count=35):
    """Generate realistic YouTube Guard activity records."""
    records = []
    now = datetime.utcnow()

    for i in range(count):
        risk_rand = random.random()
        if risk_rand < 0.6:
            risk_level = "low"
            risk_score = random.randint(10, 35)
            title = random.choice(LOW_RISK_TITLES)
        elif risk_rand < 0.85:
            risk_level = "medium"
            risk_score = random.randint(40, 65)
            title = random.choice(MEDIUM_RISK_TITLES)
        else:
            risk_level = "high"
            risk_score = random.randint(70, 95)
            title = random.choice(HIGH_RISK_TITLES)

        created_at = now - timedelta(hours=random.randint(0, 72), minutes=random.randint(0, 59))

        record = {
            "video_id": f"vid_{i:04d}_{random.randint(1000, 9999)}",
            "page_url": f"https://youtube.com/watch?v=test_{i:04d}",
            "title": title,
            "channel": random.choice(CHANNELS),
            "risk_level": risk_level,
            "risk_score": risk_score,
            "action": "allow" if risk_level == "low" else "warn" if risk_level == "medium" else "block",
            "signals": [
                {
                    "label": "sentiment" if risk_level == "low" else "risk_keyword",
                    "matches": random.randint(1, 3),
                    "weight": random.randint(5, 20),
                }
            ],
            "semantic": {
                "risk_score": risk_score,
                "risk_tags": ["wellness"] if risk_level == "low" else ["concern"] if risk_level == "medium" else ["critical"],
                "reasoning": "Content appears suitable." if risk_level == "low" else "Potentially concerning content detected." if risk_level == "medium" else "High-risk content flags triggered.",
            },
            "profile_applied": {
                "strict_mode": False,
                "allow_list_channels": [],
                "blocked_topics": [],
                "custom_block_keywords": [],
            },
            "created_at": created_at,
        }
        records.append(record)

    return records


def generate_warning_events(count=20):
    """Generate realistic warning/block events."""
    events = []
    now = datetime.utcnow()

    for i in range(count):
        event_type = "warning" if random.random() < 0.7 else "blocked"
        risk_level = random.choice(["medium", "high"]) if event_type == "warning" else "high"
        warning_count = random.randint(1, 5)
        warning_limit = 3 if event_type == "blocked" else 0

        created_at = now - timedelta(hours=random.randint(0, 96), minutes=random.randint(0, 59))

        event = {
            "event_type": event_type,
            "risk_level": risk_level,
            "risk_score": random.randint(65, 95) if risk_level == "high" else random.randint(40, 65),
            "warning_count": warning_count,
            "warning_limit": warning_limit,
            "title": random.choice(MEDIUM_RISK_TITLES + HIGH_RISK_TITLES),
            "channel": random.choice(CHANNELS),
            "page_url": f"https://youtube.com/watch?v=event_{i:04d}",
            "created_at": created_at,
        }
        events.append(event)

    return events


def seed_database():
    """Connect to MongoDB and insert test data."""
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        client.admin.command("ping")
        print("✅ Connected to MongoDB")
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")
        print("   Make sure MongoDB is running and accessible at", MONGO_URI)
        return False

    try:
        db = client[DB_NAME]

        # Clear existing data (optional - comment out to append)
        print("\n🗑️  Clearing old data...")
        db.youtube_guard_activity.delete_many({})
        db.youtube_guard_warnings.delete_many({})

        # Insert activity records
        print("📝 Generating activity records...")
        activity_records = generate_activity_records(35)
        result_activity = db.youtube_guard_activity.insert_many(activity_records)
        print(f"✅ Inserted {len(result_activity.inserted_ids)} activity records")

        # Insert warning events
        print("📝 Generating warning/block events...")
        warning_events = generate_warning_events(20)
        result_warnings = db.youtube_guard_warnings.insert_many(warning_events)
        print(f"✅ Inserted {len(result_warnings.inserted_ids)} warning/block events")

        # Show summary
        print("\n" + "=" * 50)
        print("📊 YouTube Guard Demo Data Summary")
        print("=" * 50)
        risk_dist = {
            "low": len([r for r in activity_records if r["risk_level"] == "low"]),
            "medium": len([r for r in activity_records if r["risk_level"] == "medium"]),
            "high": len([r for r in activity_records if r["risk_level"] == "high"]),
        }
        print(f"Low Risk:  {risk_dist['low']} videos")
        print(f"Medium Risk: {risk_dist['medium']} videos")
        print(f"High Risk: {risk_dist['high']} videos")
        print(f"\nWarning Events: {len([e for e in warning_events if e['event_type'] == 'warning'])}")
        print(f"Blocked Events: {len([e for e in warning_events if e['event_type'] == 'blocked'])}")
        print("\n🎉 Data seeding complete!")
        print("→ Refresh your YouTube Guard Admin page to see the data")
        print("=" * 50)

        return True

    except Exception as e:
        print(f"❌ Error during seeding: {e}")
        return False
    finally:
        client.close()


if __name__ == "__main__":
    print("🚀 YouTube Guard Demo Data Seeder\n")
    seed_database()
