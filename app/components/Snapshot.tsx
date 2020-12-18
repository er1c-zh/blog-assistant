import React from 'react';
import { clipboard, desktopCapturer, ipcRenderer, nativeImage } from 'electron';
import { withRouter } from 'react-router';
import svgSelect from '../resources/select.svg';
import svgCancel from '../resources/close.svg';
import svgUpload from '../resources/upload.svg';
import svgSave from '../resources/save.svg';

class Snapshot extends React.Component<
  // eslint-disable-next-line @typescript-eslint/ban-types
  {},
  {
    width: number | undefined;
    height: number | undefined;
    imgDataBase64: string | undefined;
  }
> {
  private maskCtx: CanvasRenderingContext2D | null | undefined;

  private maskCanvas: HTMLCanvasElement | null | undefined;

  private srcImgCtx: CanvasRenderingContext2D | null | undefined;

  private srcImgCanvas: HTMLCanvasElement | null | undefined;

  private downX = 0;

  private downY = 0;

  private upX = 0;

  private upY = 0;

  private downing = false;

  constructor(props: any) {
    super(props);
    this.state = {
      // eslint-disable-next-line react/no-unused-state
      width: 0,
      // eslint-disable-next-line react/no-unused-state
      height: 0,
      imgDataBase64: '',
    };
    document.addEventListener('keydown', (e: any) => {
      switch (e.key) {
        default:
          break;
        case 'Escape':
          console.log('get esc pressed');
          this.quitAll();
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

  private getSnapshotDataURL() {
    const { state } = this;
    console.log(state.imgDataBase64);
    if (this.srcImgCtx == null) {
      return '';
    }
    const imgData = this.srcImgCtx.getImageData(
      this.downX,
      this.downY,
      this.upX - this.downX,
      this.upY - this.downY
    );
    console.log(imgData);
    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = imgData.width;
    resultCanvas.height = imgData.height;
    const resultCtx = resultCanvas.getContext('2d');
    resultCtx?.putImageData(imgData, 0, 0);
    return resultCanvas.toDataURL();
  }

  private getSnapshotAsNativeImg() {
    return nativeImage.createFromDataURL(this.getSnapshotDataURL());
  }

  // eslint-disable-next-line class-methods-use-this
  private quitAll() {
    ipcRenderer.send('close-snapshot-all', '');
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

    const iconList: any[] = [
      {
        svgStr: svgUpload.toString(),
        onclick: () => {
          console.log('click upload!');
        },
        topLeftX: 0,
        topLeftY: 0,
        active: false,
      },
      {
        svgStr: svgSave.toString(),
        onclick: () => {
          const { idx } = (this.props as any).match.params;
          console.log('click save!');
          // eslint-disable-next-line promise/catch-or-return,promise/always-return
          ipcRenderer.invoke('show-choose-path', idx).then((path) => {
            // eslint-disable-next-line promise/always-return,promise/catch-or-return,promise/no-nesting
            ipcRenderer
              .invoke('save-img', path, this.getSnapshotDataURL())
              // eslint-disable-next-line promise/always-return
              .then((_result) => {
                ipcRenderer.send('show-notification', {
                  title: 'Saved!',
                  body: `Snapshot saved to ${_result.path} successfully.`,
                });
                this.quitAll();
              });
          });
        },
        topLeftX: 0,
        topLeftY: 0,
        active: false,
      },
      {
        svgStr: svgSelect.toString(),
        onclick: () => {
          console.log('click select tool!');
          clipboard.writeImage(this.getSnapshotAsNativeImg());
          ipcRenderer.send('show-notification', {
            title: 'Copied!',
            body: 'Snapshot copied to clipboard successfully.',
          });
          this.quitAll();
        },
        topLeftX: 0,
        topLeftY: 0,
        active: false,
      },
      {
        svgStr: svgCancel.toString(),
        onclick: () => {
          if (this.maskCanvas == null) {
            return;
          }
          this.maskCanvas.onclick = null;
          this.maskCanvas.onmousemove = null;
          this.addCanvasWaitChooseHandler();
        },
        topLeftX: 0,
        topLeftY: 0,
        active: false,
      },
    ];
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

    const drawToolIcon = (
      x: number,
      y: number,
      isActive: boolean,
      icon: string
    ) => {
      if (this.maskCtx == null) {
        return;
      }

      const iconImg = new Image();
      // eslint-disable-next-line no-loop-func
      iconImg.onload = () => {
        if (this.maskCtx != null) {
          if (isActive) {
            this.maskCtx.fillStyle = '#c2c2c2';
          } else {
            this.maskCtx.fillStyle = '#e7e7e7';
          }
          this.maskCtx.globalAlpha = 1;
          this.maskCtx.fillRect(x, y, toolBarWidthPerItem, toolBarHeight);
          this.maskCtx.globalAlpha = 1;
          this.maskCtx.drawImage(
            iconImg,
            x,
            y,
            toolBarWidthPerItem,
            toolBarHeight
          );
        }
      };
      iconImg.src = icon;
    };

    for (let i = 0; i < iconList.length; i += 1) {
      iconList[i].topLeftX = toolBarFromX + toolBarWidthPerItem * i;
      iconList[i].topLeftY = toolBarFromY;
      drawToolIcon(
        iconList[i].topLeftX,
        iconList[i].topLeftY,
        false,
        iconList[i].svgStr
      );
    }
    this.maskCanvas.onclick = (e) => {
      const { x, y } = this.convert(e);
      for (let i = 0; i < iconList.length; i += 1) {
        const icon = iconList[i];
        if (
          x >= icon.topLeftX &&
          x < icon.topLeftX + toolBarWidthPerItem &&
          y >= icon.topLeftY &&
          y < icon.topLeftY + toolBarHeight
        ) {
          icon.onclick(e);
          return;
        }
      }
    };
    console.log('register onmousemove');
    this.maskCanvas.onmousemove = (e) => {
      const { x, y } = this.convert(e);
      for (let i = 0; i < iconList.length; i += 1) {
        const icon = iconList[i];
        if (
          x >= icon.topLeftX &&
          x < icon.topLeftX + toolBarWidthPerItem &&
          y >= icon.topLeftY &&
          y < icon.topLeftY + toolBarHeight
        ) {
          if (!icon.active) {
            drawToolIcon(icon.topLeftX, icon.topLeftY, true, icon.svgStr);
            icon.active = true;
          }
        } else if (icon.active) {
          drawToolIcon(icon.topLeftX, icon.topLeftY, false, icon.svgStr);
          icon.active = false;
        }
      }
    };
  }

  private convert(e: MouseEvent) {
    const x = e.clientX;
    const y = e.clientY;
    const c = this.maskCanvas;
    if (c == null) {
      return {
        x,
        y,
      };
    }
    const convertRect = c.getBoundingClientRect();
    // eslint-disable-next-line @typescript-eslint/naming-convention,no-underscore-dangle
    const _x = x - convertRect.left * (c.width / convertRect.width);
    // eslint-disable-next-line @typescript-eslint/naming-convention,no-underscore-dangle
    const _y = y - convertRect.top * (c.height / convertRect.height);
    return {
      x: _x,
      y: _y,
    };
  }

  private addCanvasWaitChooseHandler() {
    const c = this.maskCanvas;
    const ctx = this.maskCtx;
    // eslint-disable-next-line promise/always-return
    if (c != null && ctx != null) {
      const clear = () => {
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.fillStyle = '#000000';
        ctx.globalAlpha = 0.64;
        ctx.fillRect(0, 0, c.width, c.height);
      };
      clear();
      c.onmousedown = (e: MouseEvent) => {
        const { x, y } = this.convert(e);
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
        const { x, y } = this.convert(e);
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
        const { x, y } = this.convert(e);
        console.log(`onmouseup (${x},${y})`);
        if (Math.abs(x - this.downX) < 4 || Math.abs(y - this.downY) < 4) {
          clear();
          this.downing = false;
          console.log('delta too small, skip');
          return;
        }
        this.downing = false;
        this.upX = x;
        this.upY = y;
        clear();
        ctx.clearRect(this.downX, this.downY, x - this.downX, y - this.downY);
        console.log(`(${this.downX},${this.downY}) (${this.upX},${this.upY})`);

        c.onmouseup = null;
        c.onmousedown = null;
        c.onmousemove = null;

        this.drawToolBar();
      };
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
          width: 0,
          // eslint-disable-next-line react/no-unused-state
          height: 0,

          imgDataBase64: '', // todo load fail svg
        });
        return;
      }
      // eslint-disable-next-line react/style-prop-object
      this.setState({
        width: imgData.width,
        height: imgData.height,
        imgDataBase64: imgData.data,
      });

      // eslint-disable-next-line promise/always-return
      const srcImg = new Image();
      srcImg.onload = () => {
        if (this.srcImgCanvas != null && this.srcImgCtx != null) {
          this.srcImgCtx.drawImage(srcImg, 0, 0);
        }
      };
      srcImg.src = imgData.data as string;

      ipcRenderer.send('show-snapshot', 'done');

      this.addCanvasWaitChooseHandler();
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
        <canvas
          id="src_img"
          width={`${visible.width}px`}
          height={`${visible.height}px`}
          style={{
            zIndex: 0,
            width: `${visible.width}px`,
            height: `${visible.height}px`,
          }}
          ref={(c) => {
            this.srcImgCanvas = c;
            this.srcImgCtx = c?.getContext('2d');
          }}
        />
        <canvas
          id="mask"
          width={`${visible.width}px`}
          height={`${visible.height}px`}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            zIndex: 1,
            width: `${visible.width}px`,
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
