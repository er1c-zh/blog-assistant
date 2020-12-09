import React from 'react';
import { desktopCapturer, ipcRenderer } from 'electron';
import { useParams, withRouter } from 'react-router';

class Snapshot extends React.Component {
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
          ipcRenderer.send('close-snapshot-all', '');
          break;
      }
    });
  }

  // eslint-disable-next-line class-methods-use-this,react/sort-comp
  async getScreenShot(idx: any) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    console.log(`getScreenShot idx=${idx}`);
    const result = [];
    // eslint-disable-next-line promise/catch-or-return
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
    });

    // eslint-disable-next-line no-restricted-syntax
    for (const source of sources) {
      if (source.name !== `Screen ${idx}`) {
        // eslint-disable-next-line no-continue
        continue;
      }
      console.log(source);
      console.log(`id:${source.id} display_id:${source.display_id}`);
      // eslint-disable-next-line no-await-in-loop
      const stream = await (navigator.mediaDevices as any).getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: source.id,
          },
        },
      });

      const videoContainer = document.createElement('video');
      videoContainer.srcObject = stream;
      // eslint-disable-next-line promise/always-return,promise/catch-or-return,no-await-in-loop
      await videoContainer.play();
      const snapshotCanvas = document.createElement('canvas');
      snapshotCanvas.width = videoContainer.videoWidth;
      snapshotCanvas.height = videoContainer.videoHeight;
      console.log(
        `width${videoContainer.videoWidth}height${videoContainer.videoHeight}`
      );
      const ctx = snapshotCanvas.getContext('2d');
      ctx?.drawImage(
        videoContainer,
        0,
        0,
        videoContainer.videoWidth,
        videoContainer.videoHeight
      );
      const snapshotDataURL = snapshotCanvas.toDataURL();
      // console.log(snapshotDataURL);
      result.push({
        key: snapshotDataURL,
        data: snapshotDataURL,
      });
    }
    return result;
  }

  componentDidMount() {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    // const idx = useParams();
    // eslint-disable-next-line react/destructuring-assignment,react/prop-types
    const { idx } = (this.props as any).match.params;
    // eslint-disable-next-line @typescript-eslint/no-use-before-define,promise/catch-or-return
    this.getScreenShot(idx).then((imgDataURLList) => {
      // eslint-disable-next-line react/jsx-key
      // eslint-disable-next-line no-restricted-syntax,promise/always-return
      const result: JSX.Element[] = [];
      // eslint-disable-next-line no-restricted-syntax,promise/always-return
      for (const imgData of imgDataURLList) {
        // eslint-disable-next-line jsx-a11y/alt-text
        result.push(
          // eslint-disable-next-line react/style-prop-object
          <img alt={imgData.data} src={imgData.data} />
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

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export default withRouter(Snapshot);
