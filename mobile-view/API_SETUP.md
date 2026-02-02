# API Configuration Guide

## Quick Fix: Use Production Backend

The app is configured to use the **production backend** (Railway) by default via `.env`:
```
EXPO_PUBLIC_USE_PRODUCTION=true
```

This works from **anywhere** – phone, web, different networks. No local setup needed.

**Restart Expo** after changing `.env`: stop with `Ctrl+C`, then run `npx expo start` again.

---

## Use Local Backend Instead

If you want to use your local backend (e.g. for development):

### 1. Edit `.env`
```
EXPO_PUBLIC_USE_PRODUCTION=false
# For web: uncomment next line
# EXPO_PUBLIC_API_URL=http://localhost:5000/api
# For device: use your computer's IP (run ipconfig / ifconfig)
# EXPO_PUBLIC_API_URL=http://192.168.1.X:5000/api
```

### 2. Find Your Computer's IP (for physical device)

**Windows:** `ipconfig` → look for "IPv4 Address" (e.g. 192.168.1.100)  
**Mac/Linux:** `ifconfig` → look for "inet"

### 3. Requirements for Local
- Backend running: `cd backend && npm start`
- Phone and computer on **same WiFi**
- Firewall allows port 5000

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| "Cannot connect to server" | Use production backend (set `EXPO_PUBLIC_USE_PRODUCTION=true`) or check IP/network |
| "Invalid credentials" | Connection works – check email/password in database |
| Env changes not applied | Restart Expo (`Ctrl+C` then `npx expo start`) |
