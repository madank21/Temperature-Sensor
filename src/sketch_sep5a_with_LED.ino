

#include <WiFi.h>
#include <FirebaseESP32.h>
#include <DHT.h>

// ---- WiFi ----
#define WIFI_SSID "madan"
#define WIFI_PASSWORD ".......i"

// ---- Firebase (Realtime Database, legacy secret) ----
#define FIREBASE_HOST ""
#define FIREBASE_AUTH ""

// ---- Pins ----
#define DHTPIN 4          // DHT11 data pin
#define DHTTYPE DHT11
#define LED_PIN 2         // Onboard LED - blinks on successful upload
#define ALERT_LED_PIN 5   // External LED - lights up when temp >= threshold

// ---- Alert threshold ----
const float TEMP_ALERT_THRESHOLD = 35.0; // Celsius

FirebaseData firebaseData;
FirebaseAuth firebaseAuth;
FirebaseConfig firebaseConfig;

DHT dht(DHTPIN, DHTTYPE);

unsigned long lastUpload = 0;
const unsigned long UPLOAD_INTERVAL_MS = 15000;

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true);
  delay(1000);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi connected.");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.print("WiFi FAILED. Status code: ");
    Serial.println(WiFi.status());
    Serial.println("Will keep retrying in loop().");
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  pinMode(ALERT_LED_PIN, OUTPUT);
  digitalWrite(ALERT_LED_PIN, LOW);
  dht.begin();

  connectWiFi();

  firebaseConfig.host = FIREBASE_HOST;
  firebaseConfig.signer.tokens.legacy_token = FIREBASE_AUTH;

  Firebase.begin(&firebaseConfig, &firebaseAuth);
  Firebase.reconnectWiFi(true);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, reconnecting...");
    connectWiFi();
    return;
  }

  if (millis() - lastUpload < UPLOAD_INTERVAL_MS) {
    return;
  }
  lastUpload = millis();

  float temperature = dht.readTemperature(); // Celsius
  float humidity = dht.readHumidity();       // Percent relative humidity

  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("DHT11 read failed, skipping this cycle.");
    return;
  }

  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.println(" C");

  Serial.print("Humidity: ");
  Serial.print(humidity);
  Serial.println(" %");

  // ---- Temperature alert LED ----
  if (temperature >= TEMP_ALERT_THRESHOLD) {
    digitalWrite(ALERT_LED_PIN, HIGH);
    Serial.println("ALERT: Temperature threshold reached - LED ON.");
  } else {
    digitalWrite(ALERT_LED_PIN, LOW);
  }

  bool tempOk = Firebase.setFloat(firebaseData, "/sensor/temperature", temperature);
  if (tempOk) {
    Serial.println("Temperature uploaded to Firebase.");
  } else {
    Serial.print("Temperature upload failed: ");
    Serial.println(firebaseData.errorReason());
  }

  bool humOk = Firebase.setFloat(firebaseData, "/sensor/humidity", humidity);
  if (humOk) {
    Serial.println("Humidity uploaded to Firebase.");
  } else {
    Serial.print("Humidity upload failed: ");
    Serial.println(firebaseData.errorReason());
  }

  // Blink onboard LED once if BOTH uploads succeeded
  if (tempOk && humOk) {
    digitalWrite(LED_PIN, HIGH);
    delay(200);
    digitalWrite(LED_PIN, LOW);
  }
}