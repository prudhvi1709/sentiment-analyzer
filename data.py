# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "faker",
# ]
# ///
import csv
import random
from faker import Faker
from datetime import datetime, timedelta

fake = Faker()

# Define sentiment and emotion templates
templates = {
    "positive": [
        "The support team was {} and {}. They resolved my issue quickly.",
        "I had a {} experience with customer service. The representative was very knowledgeable.",
        "Everything worked {} and I'm very {} with the service. Will definitely recommend!",
        "Your team responded {} to my query and provided {} solutions. Thank you for your help.",
        "The product exceeded my expectations, it was both {} and {}. Great value for money.",
    ],
    "negative": [
        "I faced {} issues and got no {} response. This is unacceptable.",
        "The experience was extremely {} and {}. I expected better service.",
        "I am {} with the support and the delay was {}. Please improve your response time.",
        "Your system is {} and the interface is {}. Needs major improvements.",
        "The customer service representative was {} and seemed {} about my issue. Very disappointing.",
    ],
    "neutral": [
        "The service was {} and {}. Nothing special to mention.",
        "Nothing to {}. It was an {} experience overall.",
        "Everything seems {} so far. Will update if anything changes.",
        "The product works as {}, with {} functionality. Does what it says.",
        "I received a {} response within a {} timeframe. Service was adequate.",
    ]
}

# Map sentiments to emotions with weights
emotions_map = {
    "positive": ["joy", "surprise", "joy", "joy", "surprise"],  # More joy than surprise
    "negative": ["anger", "disgust", "sadness", "fear", "anger", "disgust"],  # More anger and disgust
    "neutral": ["neutral"]
}

# Expanded word pools with more natural variations
positive_words = ["quick", "helpful", "pleasant", "excellent", "smooth", "happy", "efficient", 
                 "responsive", "impressive", "delightful", "outstanding", "exceptional", "satisfying",
                 "professional", "courteous", "thorough", "attentive", "knowledgeable", "reliable"]
negative_words = ["frustrating", "delayed", "unhelpful", "terrible", "disappointing", "annoying", 
                 "unresponsive", "confusing", "inadequate", "unreliable", "disastrous", "poor", "unacceptable",
                 "slow", "incompetent", "rude", "negligent", "inconsistent", "problematic"]
neutral_words = ["standard", "okay", "normal", "expected", "typical", "average", "adequate", 
                "reasonable", "sufficient", "functional", "basic", "regular", "conventional",
                "moderate", "satisfactory", "acceptable", "decent", "fair", "mediocre"]

# Expanded categories with weights
categories = {
    "support": 0.25,
    "complaint": 0.15,
    "feedback": 0.10,
    "bug": 0.10,
    "billing": 0.10,
    "onboarding": 0.05,
    "feature request": 0.05,
    "technical issue": 0.05,
    "account management": 0.05,
    "product question": 0.05,
    "service outage": 0.02,
    "general inquiry": 0.02,
    "installation help": 0.01
}

# Generate data with realistic distribution
rows = []
start_date = datetime.now() - timedelta(days=365)  # One year of data
end_date = datetime.now()

# Generate entries with realistic daily distribution
current_date = start_date
while current_date <= end_date:
    # Generate 1-5 entries per day with higher probability during business hours
    num_entries = random.choices([1, 2, 3, 4, 5], weights=[0.2, 0.3, 0.3, 0.15, 0.05])[0]
    
    for _ in range(num_entries):
        # Generate time between 8 AM and 8 PM (business hours) with higher probability
        hour = random.choices(
            list(range(8, 21)),  # 8 AM to 8 PM
            weights=[1, 1, 2, 2, 3, 3, 4, 4, 4, 3, 3, 2, 2]  # Higher weights during peak hours
        )[0]
        minute = random.randint(0, 59)
        
        timestamp = current_date.replace(hour=hour, minute=minute)
        
        # Generate sentiment with realistic distribution
        sentiment = random.choices(
            ["positive", "negative", "neutral"],
            weights=[0.6, 0.2, 0.2]  # More positive than negative/neutral
        )[0]
        
        template = random.choice(templates[sentiment])
        
        # Assign appropriate words based on sentiment
        if sentiment == "positive":
            words = random.sample(positive_words, min(2, len(positive_words)))
        elif sentiment == "negative":
            words = random.sample(negative_words, min(2, len(negative_words)))
        else:
            words = random.sample(neutral_words, min(2, len(neutral_words)))
        
        # Generate text
        text = template.format(*words)
        
        # Select category based on weights
        category = random.choices(
            list(categories.keys()),
            weights=list(categories.values())
        )[0]
        
        # Assign emotion based on sentiment
        emotion = random.choice(emotions_map[sentiment])
        
        # Add row with timestamp
        rows.append([text, timestamp.strftime("%Y-%m-%d %H:%M:%S"), category, sentiment, emotion])
    
    current_date += timedelta(days=1)

# Sort rows by timestamp
rows.sort(key=lambda x: x[1])

# Write to CSV
with open("sample_service_data.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["text", "timestamp", "category", "sentiment", "emotion"])
    writer.writerows(rows)

print(f"✅ sample_service_data.csv created with {len(rows)} realistic test cases.")