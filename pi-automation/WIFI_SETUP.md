# Raspberry Pi WiFi Network Configuration

## Method 1: Using the Desktop GUI (if you have a monitor and mouse)

### With On-Screen Keyboard (No Physical Keyboard Needed)

1. **Enable the on-screen keyboard:**
   - Click on the Raspberry Pi menu (top-left corner)
   - Go to **Preferences** → **Raspberry Pi Configuration**
   - Click the **Interfaces** tab
   - Enable **VNC** (this will give you access to the on-screen keyboard)
   - Click **OK** and reboot if prompted

2. **Open the on-screen keyboard:**
   - Right-click on the desktop
   - Select **Open Terminal**
   - In the terminal, type: `onboard`
   - Press Enter (or use the mouse to click the on-screen keyboard)
   - An on-screen keyboard will appear

3. **Connect to WiFi:**
   - **Right-click on the WiFi icon** in the top-right corner of the desktop
   - **Select your new WiFi network** from the list
   - **Click in the password field** when prompted
   - **Use the on-screen keyboard** to type your WiFi password
   - **Click "OK"** to connect

### Alternative: Open On-Screen Keyboard via Menu
- Click the Raspberry Pi menu → **Accessories** → **Onboard** (if available)
- Or go to **Preferences** → **Main Menu Editor** and enable keyboard tools

## Method 2: Using Command Line (SSH or terminal)

### Option A: Using raspi-config (Recommended)
1. Open terminal and run:
   ```bash
   sudo raspi-config
   ```
2. Navigate to **"System Options"** → **"Wireless LAN"**
3. Enter your **WiFi network name (SSID)**
4. Enter your **WiFi password**
5. Select **"Finish"** and reboot

### Option B: Manual Configuration
1. Edit the wpa_supplicant configuration file:
   ```bash
   sudo nano /etc/wpa_supplicant/wpa_supplicant.conf
   ```

2. Add your new network configuration at the end of the file:
   ```
   network={
       ssid="YOUR_NEW_WIFI_NAME"
       psk="YOUR_NEW_WIFI_PASSWORD"
       key_mgmt=WPA-PSK
   }
   ```

3. Save and exit (Ctrl+X, then Y, then Enter)

4. Restart the WiFi interface:
   ```bash
   sudo wpa_cli -i wlan0 reconfigure
   ```

## Method 3: Using nmcli (Network Manager)

1. **Scan for available networks:**
   ```bash
   sudo nmcli dev wifi
   ```

2. **Connect to your new network:**
   ```bash
   sudo nmcli dev wifi connect "YOUR_WIFI_NAME" password "YOUR_WIFI_PASSWORD"
   ```

## Verification Steps

1. **Check if connected:**
   ```bash
   iwconfig wlan0
   ```

2. **Test internet connectivity:**
   ```bash
   ping -c 4 google.com
   ```

3. **Check IP address:**
   ```bash
   hostname -I
   ```

## Troubleshooting

### If WiFi doesn't connect:

1. **Check WiFi is enabled:**
   ```bash
   sudo rfkill unblock wifi
   ```

2. **Restart networking service:**
   ```bash
   sudo systemctl restart networking
   ```

3. **Reboot the Pi:**
   ```bash
   sudo reboot
   ```

### For hidden networks:
Add `scan_ssid=1` to the network block in wpa_supplicant.conf:
```
network={
    ssid="YOUR_HIDDEN_NETWORK"
    psk="YOUR_PASSWORD"
    key_mgmt=WPA-PSK
    scan_ssid=1
}
```

## Important Notes

- Replace `"YOUR_NEW_WIFI_NAME"` with your actual WiFi network name
- Replace `"YOUR_NEW_WIFI_PASSWORD"` with your actual WiFi password
- WiFi passwords are case-sensitive
- Some special characters in passwords may need to be escaped

## After Connecting

Once connected to the new WiFi network, the automation scripts should continue to work normally. The cron job will run as scheduled and the Pi will be able to:
- Access the GitHub Pages URL
- Send Slack notifications
- Clean up GitHub repository files
- Log automation activities

No changes to the automation code are needed - it will automatically use the new internet connection.
