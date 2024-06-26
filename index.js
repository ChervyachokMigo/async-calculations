
const { existsSync }  = require( 'node:fs');
const path = require('node:path');
const { isMainThread }  = require( 'node:worker_threads');

module.exports = async ({ max, data, procedure_path, procedure_data }) => {
	console.time('done');

	if (isMainThread) {
		if (!existsSync(procedure_path)){
			throw new Error('procedure_path not found');
		}
		
		const { Worker } = require('node:worker_threads');

		const actions = {
			current: 0,
			max: 4,
			data_in: [],
			data_out: []
		}

		actions.max = max;
		actions.data_in = data;

		console.log('set', max, 'threads');
		console.log ('data_in', actions.data_in.length);

		for (actions.current = 0; actions.current < actions.max; actions.current++ ) {

			const worker = new Worker( path.join( __dirname, 'child.js'), { workerData: { procedure_path, procedure_data } });

			console.log('create', actions.current, 'worker');

			worker.postMessage(actions.data_in.pop());

			worker.on('message', (data_out) => {
				actions.data_out.push(data_out);
				if (actions.data_in.length > 0) {
					worker.postMessage(actions.data_in.pop());
				} else {
					worker.terminate();
				}
				
			});
		}

		while (actions.data_in.length > 0) {
			await new Promise(resolve => setTimeout(resolve, 1000));
		}

		console.log ('data_out', actions.data_out.length);
		
		console.timeEnd('done');

	}
}
