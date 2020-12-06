import React from 'react';
import { desktopCapturer, ipcRenderer } from 'electron';

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
    await desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
      // eslint-disable-next-line no-restricted-syntax,promise/always-return
      for (const source of sources) {
        result.push(source.thumbnail.toDataURL());
      }
    });
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
