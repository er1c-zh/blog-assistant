import React from 'react';
import { desktopCapturer, ipcRenderer } from 'electron';
import { withRouter } from 'react-router';
import svgSelect from '../resources/select-bold.svg';
import svgCancel from '../resources/close-bold.svg';

class Snapshot extends React.Component<
  // eslint-disable-next-line @typescript-eslint/ban-types
  {},
  {
    img: null | JSX.Element;
    width: number | undefined;
    height: number | undefined;
  }
> {
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor,react/sort-comp
  private maskCtx: CanvasRenderingContext2D | null | undefined;

  private maskCanvas: HTMLCanvasElement | null | undefined;

  private downX = 0;

  private downY = 0;

  private upX = 0;

  private upY = 0;

  private downing = false;

  constructor(props: any) {
    super(props);
    this.state = {
      // eslint-disable-next-line react/no-unused-state
      img: null,
      // eslint-disable-next-line react/no-unused-state
      width: 0,
      // eslint-disable-next-line react/no-unused-state
      height: 0,
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
  private async getScreenShot(idx: any) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    console.log(`getScreenShot idx=${idx}`);
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
          cursor: 'never',
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
      return {
        ok: true,
        key: snapshotDataURL,
        data: snapshotDataURL,
        height: videoContainer.videoHeight,
        width: videoContainer.videoWidth,
      };
    }
    return {
      ok: false,
      msg: 'fail to get snapshot!',
    };
  }

  private async drawToolBar() {
    console.log(
      `drawToolBar canvas width:${this.maskCanvas?.width}, height:${this.maskCanvas?.height}`
    );
    if (!this.maskCanvas) {
      console.log('this.maskCanvas is null');
      return;
    }
    if (!this.maskCtx) {
      console.log('this.maskCtx is null');
      return;
    }

    const iconList: string[] = [svgSelect.toString(), svgCancel.toString()];
    const iconCnt = iconList.length;
    // const toolBarHeight = this.maskCanvas.height / 32;
    const toolBarHeight = 32;
    const toolBarWidthPerItem = toolBarHeight;
    const toolBarFromX = Math.max(
      0,
      Math.max(this.upX, this.downX) - iconCnt * toolBarWidthPerItem
    );
    const toolBarFromY = Math.min(
      Math.max(this.upY, this.downY),
      this.maskCanvas.height - toolBarHeight
    );

    console.log(`drawToolBar(${toolBarFromX},${toolBarFromY})`);

    this.maskCtx.fillStyle = '#ff00ff';
    this.maskCtx.globalAlpha = 1;
    this.maskCtx.fillRect(
      toolBarFromX,
      toolBarFromY,
      toolBarWidthPerItem * 2,
      toolBarHeight
    );
    this.maskCtx.fillStyle = '#00ff00';
    this.maskCtx.globalAlpha = 1;

    for (let i = 0; i < iconList.length; i += 1) {
      const iconImg = new Image();
      // eslint-disable-next-line no-loop-func
      iconImg.onload = () => {
        if (this.maskCtx != null) {
          this.maskCtx.globalAlpha = 1;
          this.maskCtx.drawImage(
            iconImg,
            toolBarFromX + toolBarWidthPerItem * i,
            toolBarFromY,
            toolBarWidthPerItem,
            toolBarHeight
          );
        }
      };
      iconImg.src = iconList[i];
    }
  }

  // eslint-disable-next-line react/sort-comp
  componentDidMount() {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    // const idx = useParams();
    // eslint-disable-next-line react/destructuring-assignment,react/prop-types
    const { idx } = (this.props as any).match.params;
    // eslint-disable-next-line @typescript-eslint/no-use-before-define,promise/catch-or-return,promise/always-return
    this.getScreenShot(idx).then((imgData) => {
      // eslint-disable-next-line promise/always-return
      if (!imgData.ok) {
        this.setState({
          // eslint-disable-next-line react/no-unused-state
          img: <p>${imgData.msg}</p>,
          // eslint-disable-next-line react/no-unused-state
          width: 0,
          // eslint-disable-next-line react/no-unused-state
          height: 0,
        });
        return;
      }
      // eslint-disable-next-line jsx-a11y/alt-text
      const img = (
        // eslint-disable-next-line jsx-a11y/alt-text
        <img
          src={imgData.data}
          style={{
            zIndex: 0,
            width: imgData.width,
            height: imgData.height,
          }}
        />
      );
      // eslint-disable-next-line react/style-prop-object
      // <img alt={imgData?.data} src={imgData?.data} style={Map(
      // )}/>
      this.setState({
        // eslint-disable-next-line react/no-unused-state
        img,
        // eslint-disable-next-line react/no-unused-state
        width: imgData.width,
        // eslint-disable-next-line react/no-unused-state
        height: imgData.height,
      });
      ipcRenderer.send('show-snapshot', 'done');

      const c = this.maskCanvas;
      const ctx = this.maskCtx;
      // eslint-disable-next-line promise/always-return
      if (c != null && ctx != null) {
        const convert = (e: MouseEvent) => {
          const x = e.clientX;
          const y = e.clientY;
          const convertRect = c.getBoundingClientRect();
          console.log(convertRect);
          // eslint-disable-next-line @typescript-eslint/naming-convention,no-underscore-dangle
          const _x = x - convertRect.left * (c.width / convertRect.width);
          // eslint-disable-next-line @typescript-eslint/naming-convention,no-underscore-dangle
          const _y = y - convertRect.top * (c.height / convertRect.height);
          console.log(`convert(${x},${y}) to (${_x},${_y})`);
          return {
            x: _x,
            y: _y,
          };
        };
        const clear = () => {
          ctx.clearRect(0, 0, c.width, c.height);
          ctx.fillStyle = '#000000';
          ctx.globalAlpha = 0.64;
          ctx.fillRect(0, 0, c.width, c.height);
        };
        clear();
        c.onmousedown = (e: MouseEvent) => {
          const { x, y } = convert(e);
          console.log(`onmousedown (${x},${y})`);
          clear();
          this.downX = x;
          this.downY = y;
          this.downing = true;
        };
        c.onmousemove = (e: MouseEvent) => {
          if (!this.downing) {
            return;
          }
          const { x, y } = convert(e);
          console.log(`onmousemove(${x},${y})`);
          clear();
          console.log(
            `clearReact(${this.downX}, ${this.downY}, ${x - this.downX}, ${
              y - this.downY
            })`
          );
          clear();
          ctx.clearRect(this.downX, this.downY, x - this.downX, y - this.downY);
        };
        c.onmouseup = (e: MouseEvent) => {
          const { x, y } = convert(e);
          console.log(`onmouseup (${x},${y})`);
          this.downing = false;
          this.upX = x;
          this.upY = y;
          clear();
          ctx.clearRect(this.downX, this.downY, x - this.downX, y - this.downY);
          console.log(
            `(${this.downX},${this.downY}) (${this.upX},${this.upY})`
          );
          this.drawToolBar();
        };
      }
    });
  }

  render() {
    const visible = this.state;
    // eslint-disable-next-line react/prop-types,react/destructuring-assignment
    return (
      <div
        id="shot_container"
        style={{
          width: `${visible.width}px`,
          height: `${visible.height}px`,
        }}
      >
        {/* eslint-disable-next-line react/destructuring-assignment */}
        {visible.img}
        <canvas
          id="mask"
          width={`${visible.width}px`}
          height={`${visible.height}px`}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            zIndex: 1,
            // eslint-disable-next-line react/destructuring-assignment
            width: `${visible.width}px`,
            // eslint-disable-next-line react/destructuring-assignment
            height: `${visible.height}px`,
          }}
          ref={(c) => {
            this.maskCanvas = c;
            this.maskCtx = c?.getContext('2d');
          }}
        />
      </div>
    );
  }
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export default withRouter(Snapshot);
