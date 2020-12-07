import React from 'react';
import { desktopCapturer, DesktopCapturerSource, ipcRenderer } from 'electron';

export default class Snapshot extends React.Component {
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(props: any) {
    super(props);
    this.state = {
      imgList: [],
    };
    document.addEventListener('keydown', (e: any) => {
      switch (e.key) {
        default:
          break;
        case 'Escape':
          console.log('get esc pressed');
          window.close();
          break;
      }
    });
  }

  // eslint-disable-next-line class-methods-use-this,react/sort-comp
  async getScreenShot() {
    const result: string[] = [];
    // eslint-disable-next-line promise/catch-or-return
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
    });

    // eslint-disable-next-line no-restricted-syntax
    for (const source of sources) {
      console.log(`id:${source.id} display_id:${source.display_id}`);
      // eslint-disable-next-line no-await-in-loop
      const stream = await (navigator.mediaDevices as any).getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: source.id,
            maxHeight: 4000,
            maxWidth: 4000,
          },
        },
      });

      const videoContainer = document.createElement('video');
      videoContainer.srcObject = stream;
      // eslint-disable-next-line promise/always-return,promise/catch-or-return,no-await-in-loop
      await videoContainer.play();
      const snapshotCanvas = document.createElement('canvas');
      snapshotCanvas.width = 1920;
      snapshotCanvas.height = 1080;
      console.log(`width${videoContainer.width}height${videoContainer.height}`);
      const ctx = snapshotCanvas.getContext('2d');
      ctx?.drawImage(videoContainer, 0, 0, 1920, 1080);
      const snapshotDataURL = snapshotCanvas.toDataURL();
      // console.log(snapshotDataURL);
      result.push(snapshotDataURL);
    }
    return result;
  }

  componentDidMount() {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define,promise/catch-or-return
    this.getScreenShot().then((imgDataURLList) => {
      // eslint-disable-next-line react/jsx-key
      // eslint-disable-next-line no-restricted-syntax,promise/always-return
      const result: JSX.Element[] = [];
      // eslint-disable-next-line no-restricted-syntax,promise/always-return
      for (const imgData of imgDataURLList) {
        // eslint-disable-next-line jsx-a11y/alt-text
        result.push(
          // eslint-disable-next-line react/style-prop-object
          <img alt={imgData} src={imgData} />
        );
        result.push(<br />);
      }
      this.setState({
        imgList: result,
      });
      ipcRenderer.send('show-snapshot', 'done');
    });
  }

  render() {
    // eslint-disable-next-line react/prop-types,react/destructuring-assignment
    return <div id="shot_container">{this.state.imgList}</div>;
  }
}
