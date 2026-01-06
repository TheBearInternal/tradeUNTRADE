# 📱 Building an APK for Android

Currently, the mobile app runs through **Expo Go**, but you can build a standalone APK.

## Option 1: Use Expo Go (Easiest - No APK Needed)

This is the quickest way to test on your phone:

1. **Install Expo Go** from Play Store (free)
2. **Start the app**:
   ```bash
   cd tradeUNTRADE/mobile
   npm start
   ```
3. **Scan the QR code** with Expo Go
4. ✅ App loads on your phone!

**Note**: You need your phone and computer on the same WiFi network.

---

## Option 2: Build Standalone APK (No Expo Go Required)

Build a real APK you can install and share.

### Prerequisites
- Expo account (free) - Sign up at https://expo.dev
- EAS CLI installed

### Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

### Step 2: Login to Expo

```bash
eas login
```

### Step 3: Configure the Build

```bash
cd tradeUNTRADE/mobile

# Initialize EAS
eas build:configure
```

### Step 4: Update API URL for Production

Edit `mobile/src/services/api.js`:

```javascript
// Change this line:
const API_BASE_URL = 'http://localhost:3000/api/v1';

// To your production API URL:
const API_BASE_URL = 'https://your-api-domain.com/api/v1';
// OR use your computer's IP if testing locally:
const API_BASE_URL = 'http://192.168.1.5:3000/api/v1';
```

### Step 5: Build APK

```bash
# Build for Android (APK)
eas build --platform android --profile preview
```

**Choose options:**
- Build type: `apk` (not aab)
- This creates a build on Expo's servers
- Takes 10-20 minutes

### Step 6: Download APK

Once complete:
1. You'll get a download link
2. Download the APK to your phone
3. Install it (you may need to enable "Install from Unknown Sources")

---

## Option 3: Local Build (Advanced)

Build locally without Expo's cloud:

### Prerequisites
- Android Studio installed
- Android SDK configured

### Steps

```bash
cd tradeUNTRADE/mobile

# Build locally
eas build --platform android --local
```

This creates an APK in your local directory.

---

## Quick Comparison

| Method | APK File? | Internet Required? | Expo Go Needed? | Best For |
|--------|-----------|-------------------|-----------------|----------|
| **Expo Go** | ❌ No | ✅ Yes (WiFi) | ✅ Yes | Quick testing |
| **EAS Build** | ✅ Yes | Only for build | ❌ No | Production/sharing |
| **Local Build** | ✅ Yes | No | ❌ No | Offline development |

---

## Recommended Approach

### For Testing (Right Now):
**Use Expo Go** - It's fastest and requires zero configuration.

1. Install Expo Go on your phone
2. Run `cd mobile && npm start`
3. Scan QR code
4. ✅ Done!

### For Production/Sharing:
**Use EAS Build** to create a real APK you can share with others.

---

## Important Notes

### API URL Configuration

When building an APK, you need a **publicly accessible API**. You have options:

**Option A: Deploy Backend to Cloud**
- Deploy your backend to AWS/DigitalOcean/Heroku
- Use that URL in the mobile app
- Recommended for production

**Option B: Use ngrok for Testing**
```bash
# In a new terminal
ngrok http 3000

# You'll get a URL like: https://abc123.ngrok.io
# Use this in mobile app: https://abc123.ngrok.io/api/v1
```

**Option C: Local Network (Testing Only)**
- Use your computer's local IP (like `http://192.168.1.5:3000`)
- Only works when phone and computer are on same WiFi

### App Configuration

Before building, update these files:

**mobile/app.json:**
```json
{
  "expo": {
    "name": "Congressional Trading",
    "slug": "congressional-trading",
    "version": "1.0.0",
    "android": {
      "package": "com.yourcompany.congressionaltrading",
      "versionCode": 1
    }
  }
}
```

Change `com.yourcompany.congressionaltrading` to your own package name.

---

## Build Time Estimates

- **Expo Go**: < 1 minute (just start dev server)
- **EAS Cloud Build**: 10-20 minutes
- **Local Build**: 5-10 minutes (after Android Studio setup)

---

## Troubleshooting

### "Build failed"
- Check app.json is valid JSON
- Ensure package name is unique
- Check EAS quota (free tier has limits)

### "Cannot connect to API"
- Verify API URL is accessible from phone
- Test in browser first: `http://YOUR_API_URL/health`
- Check firewall isn't blocking connections

### "App crashes on start"
- Check logs: `npx expo start` and look for errors
- Verify all dependencies installed: `npm install`
- Check API URL is correct

---

## Cost

- **Expo Go**: Free
- **EAS Build**: Free tier includes builds per month
- **Local Build**: Free (but requires Android Studio setup)

---

## Want an APK Right Now?

**Fastest path:**

1. I'll update the mobile app configuration for building
2. You run: `npm install -g eas-cli`
3. You run: `eas login` (create free account)
4. You run: `eas build --platform android --profile preview`
5. Wait 15 minutes
6. Download and install APK!

**Should I create the build configuration files for you?** Just say "yes, set up the build" and I'll configure everything needed for EAS Build!
