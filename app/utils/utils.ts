// eslint-disable-next-line import/prefer-default-export
import global from '../constants/global.json';

export default {
  genImgFileName(ext = global.img_default_ext) {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return `${global.img_default_prefix}${now
      .toJSON()
      .substr(0, 19)
      .replace(/[-T]/g, '')
      .replace(/:/g, '')}.${ext}`;
  },
};
