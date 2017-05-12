module.exports = {
  output: render
};

function render (res, output, eventMessage) {
  res.render('index', {
    result: output,
    event: eventMessage
  });
}

