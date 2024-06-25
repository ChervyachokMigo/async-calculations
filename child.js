const { isMainThread } = require('node:worker_threads');
const { parentPort, workerData } = require('node:worker_threads');

// CHILD
if ( !isMainThread ) {
	const procedure =  require(workerData);
	parentPort.on('message', (data_in) => {
		const data_out = procedure(data_in);
		parentPort.postMessage(data_out);
	});
} else {
	console.log('main thread');
}