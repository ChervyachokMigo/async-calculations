
const { existsSync }  = require( 'node:fs');
const path = require('node:path');
const { isMainThread }  = require( 'node:worker_threads');

module.exports = async ({ max, data, procedure_path, procedure_data, print_frequerency = 1000 }) => {
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

		const data_length = actions.data_in.length;
		const data_length_1000 = print_frequerency === 0 ? 0 : actions.data_in.length / print_frequerency;

		for (actions.current = 0; actions.current < actions.max; actions.current++ ) {

			const worker = new Worker( path.join( __dirname, 'child.js'), { workerData: { procedure_path, procedure_data } });

			console.log('create', actions.current, 'worker');

			worker.postMessage(actions.data_in.pop());

			worker.on('message', (data_out) => {
				actions.data_out.push(data_out);
				if (actions.data_in.length > 0) {
					worker.postMessage(actions.data_in.pop());
					if (print_frequerency && actions.data_in.length % print_frequerency == 0) {
						console.log( ( (data_length-actions.data_in.length)/data_length_1000/10).toFixed(1), '%')
					}
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

		return actions.data_out;

	}
}
