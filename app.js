const electron = require('electron');
const Positioner = require('electron-positioner');
const ipc = require('node-ipc');
ipc.config.id = 'screenCastWindow';
ipc.config.retry = 1500;
ipc.config.socketRoot = 'tmp';
ipc.config.networkHost = 'localhost';
ipc.config.appSpace = 'MMM-Screencast';
ipc.config.port = 8123;

const url = process.argv[2];
const position = process.argv[3];
const width = parseInt(process.argv[4], 10);
const height = parseInt(process.argv[5], 10);

// more useragents here: https://developers.whatismybrowser.com/useragents/explore/operating_platform/smart-tv/
const userAgent = 'Mozilla/5.0 (SMART-TV; Linux; Tizen 2.4.0) AppleWebkit/538.1 (KHTML, like Gecko) SamsungBrowser/1.1 TV Safari/538.1';
const socketDomain = `/${ipc.config.socketRoot}/${ipc.config.appSpace}.${ipc.config.id}`;


const app = electron.app;


ipc.serve(socketDomain, () => {

  ipc.server.on('quit', (data, socket) => {
    ipc.server.emit(socket, 'quit');
    app.quit();
    process.exit();
  });

});

app.once('ready', () => {
  electron.session.defaultSession.setUserAgent(userAgent);
  
  // electron

  const windowOptions = {
    maxHeight: height,
    maxWidth: width,
    resize: false,
    width: width,
    height: height,
    darkTheme: true,
    alwayOnTop: true,
    show: false,
    frame: false,
    zoomFactor: 1.0,
    focusable: false
  };

  const screenCastWindow = new electron.BrowserWindow(windowOptions);

  const positioner = new Positioner(screenCastWindow)
  positioner.move(position);

  screenCastWindow.loadURL(url);

  // Show window when page is ready
  screenCastWindow.once('ready-to-show', () => {

    // this is messy for autoplay but youtube, due to chrome no longer supports
    // autoplay
    const autoPlayScript = `
      const videoEle = screenCastWindow.document.getElementsByTagName('video');
      if (!!videoEle && videoEle.length > 1) videoEle[0].play();
    `;

    const autoCloseScript = `

    `;

    screenCastWindow.show();
    screenCastWindow.webContents.executeJavaScript(autoPlayScript, true);

    //
    // THIS MIGHT NEED WORK
    //
    ipc.server.on('screenCastWindow_config', (data, socket) => {
      const { extraScript, closeOnEnd } = data;
      
      const doScript = `${extraScript} ${closeOnEnd ? autoCloseScript : ''}`;
      screenCastWindow.webContents.executeJavaScript(doScript, true);

      ipc.server.emit(socket, 'quit');
      app.quit();
      process.exit();
    });

    ipc.server.broadcast('screenCastWindow_shown', { show: true });

  });

});

ipc.server.start();
