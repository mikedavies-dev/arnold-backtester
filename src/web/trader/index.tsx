import ReactDom from 'react-dom';

const container = document.getElementById('container');

if (container) {
  ReactDom.render(<div>Live Trade Results</div>, container);
}
