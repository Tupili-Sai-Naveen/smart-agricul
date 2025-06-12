import sys
import json
import pandas as pd
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LinearRegression

# Load dataset
df = pd.read_csv('Crop_recommendation.csv')

X_crop = df.drop('label', axis=1)
y_crop = df['label']

# Crop prediction model
le = LabelEncoder()
y_crop_encoded = le.fit_transform(y_crop)

scaler = StandardScaler()
X_crop_scaled = scaler.fit_transform(X_crop)

crop_model = RandomForestClassifier(n_estimators=100, random_state=42)
crop_model.fit(X_crop_scaled, y_crop_encoded)

# Yield prediction (simulate with made-up yield data)
import numpy as np
df['yield'] = np.random.uniform(1.0, 4.0, size=len(df))  # dummy yield

X_yield = df.drop(['label', 'yield'], axis=1)
y_yield = df['yield']
X_yield_scaled = scaler.transform(X_yield)

yield_model = LinearRegression()
yield_model.fit(X_yield_scaled, y_yield)

# Handle input
input_json = sys.stdin.read()
data = json.loads(input_json)

features = [[
    data['N'], data['P'], data['K'],
    data['temperature'], data['humidity'],
    data['ph'], data['rainfall']
]]

features_scaled = scaler.transform(features)

# Predict crop
pred_crop_encoded = crop_model.predict(features_scaled)[0]
pred_crop = le.inverse_transform([pred_crop_encoded])[0]

# Predict yield
pred_yield = yield_model.predict(features_scaled)[0]

# Output
print(json.dumps({"prediction": pred_crop, "yield": round(float(pred_yield), 2)}))
