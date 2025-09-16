# Total Tab Timer

A Chrome extension that helps you manage tab clutter and boost productivity by automatically closing tabs with countdown timers or scheduled times.

## Features

- **Countdown Timers**: Set timers to close tabs after a specific duration (hours, minutes, seconds)
- **Scheduled Timers**: Close tabs at a specific date and time
- **Custom Labels**: Add optional labels to organize your timers
- **Active Timer Management**: View and manage all active timers across all tabs
- **Real-time Updates**: Live countdown display showing remaining time
- **Persistent Storage**: Timers survive browser restarts and continue running
- **Clean Interface**: Modern, intuitive popup interface

## Installation

### From Chrome Web Store
*Coming soon - Extension will be available on the Chrome Web Store*

### Manual Installation (Developer Mode)
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension folder
5. The Total Tab Timer icon will appear in your Chrome toolbar

## Usage

### Setting a Timer
1. Click the Total Tab Timer icon in your Chrome toolbar
2. Choose your timer type:
   - **Countdown**: Set hours, minutes, and seconds for the tab to close
   - **Specific Time**: Choose an exact date and time for closure
3. Optionally add a custom label for easy identification
4. Click "Set Timer"

### Managing Timers
- **Current Tab**: View timers set for the currently active tab
- **All Timers**: See all active timers across all tabs
- **Edit**: Click on any timer to modify its settings
- **Delete**: Remove individual timers or clear all at once
- **Real-time Display**: Watch countdown timers update in real-time

## Permissions

This extension requires the following permissions:
- **tabs**: To access tab information and close tabs when timers expire
- **alarms**: To create persistent timers that work even when the browser is closed
- **storage**: To save timer data and settings
- **host_permissions**: To work on all websites

## Technical Details

- **Manifest Version**: 3 (latest Chrome extension standard)
- **Minimum Chrome Version**: 88
- **Architecture**: Service Worker background script with popup interface
- **Storage**: Chrome local storage for timer persistence
- **Alarms API**: Chrome alarms for reliable timer execution

## File Structure

```
chrome_timer_v1/
├── manifest.json          # Extension configuration
├── background/
│   └── service-worker.js   # Background timer management
├── popup/
│   ├── popup.html         # Extension popup interface
│   ├── popup.css          # Styling for popup
│   └── popup.js           # Popup functionality
└── icons/
    ├── icon16.png         # 16x16 icon
    ├── icon48.png         # 48x48 icon
    └── icon128.png        # 128x128 icon
```

## Privacy

This extension:
- ✅ Does NOT collect any personal data
- ✅ Does NOT track browsing history
- ✅ Does NOT send data to external servers
- ✅ Only stores timer data locally on your device

## Support

- **Issues**: Report bugs or request features on [GitHub Issues](https://github.com/ChadwickFenwick/Total-Tab-Timer/issues)
- **Author**: [ChadwickFenwick](https://github.com/ChadwickFenwick)
- **Support**: [Buy Me a Coffee ☕](https://ko-fi.com/chadfenwick)

## License

This project is open source. Feel free to fork, modify, and contribute!

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Changelog

### v1.0.1
- Initial release
- Countdown and scheduled timer functionality
- Real-time timer updates
- Persistent timer storage
- Clean popup interface
