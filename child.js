const { isMainThread } = require('node:worker_threads');
const { parentPort, workerData } = require('node:worker_threads');

// CHILD
if ( !isMainThread ) {
	const procedure =  require(workerData.procedure_path);
	parentPort.on('message', (data_in) => {
		const data_out = procedure(data_in, workerData.procedure_data);
		parentPort.postMessage(data_out);
	});
} else {
	console.log('main thread');
}