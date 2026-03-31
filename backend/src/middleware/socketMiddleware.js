export const attachIo = (io) => (req, res, next) => {
  req.io = io;
  next();
};

export default attachIo;
