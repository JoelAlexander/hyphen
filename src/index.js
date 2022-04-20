import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/App';

import 'purecss/build/pure.css';
import './styles.css';

function runApp(serviceWorkerRegistration) {
	ReactDOM.render(
	  <App serviceWorkerRegistration={serviceWorkerRegistration} />,
	  document.getElementById('root'));
}

if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('/service-worker.js').then(registration => {
			runApp(registration);
		})
		.catch(registrationError => {
			console.log('SW registration failed: ', registrationError);
		});
	});
}



