
const { existsSync }  = require( 'node:fs');
const path = require('node:path');
const { isMainThread }  = require( 'node:worker_threads');

module.exports = async ({ max, data, procedure_path, procedure_data, print_frequerency = 1000, proxy_list = [] }) => {
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

		const proxy_locked_states = proxy_list.map( (x, i) => ({...x, id: i, locked: false }));

		console.log( 'checking proxy:', 
			proxy_locked_states.length >= actions.max ? 
				'success' : 
				'less than actions'
		);

		const data_length = actions.data_in.length;

		const get_proxy = () => {
			const res = proxy_locked_states.find( x => x.locked === false );
			if (res) {
                res.locked = true;
                return res;
            } else {
				return false;
			}
		}

		const unlock_proxy = (id) => {
			const res = proxy_locked_states.find( x => x.id === id );
            if (res) {
                res.locked = false;
            } else {
				return false;
			}
		}

		for (actions.current = 0; actions.current < actions.max; actions.current++ ) {

			const worker = new Worker( path.join( __dirname, 'child.js'), { workerData: { procedure_path, procedure_data } });

			console.log('create', actions.current, 'worker');

			worker.postMessage({ data_in: actions.data_in.pop(), proxy: get_proxy() });

			worker.on('message', (data_out) => {

				if (data_out.status === 'error') {

					if (!data_out.proxy) {
						worker.postMessage({ data_in: data_out.data_in, proxy: false });
						return;
					}

					console.log(`proxy: ${data_out.proxy.host}:${data_out.proxy.port}`);

					if (data_out.error.indexOf('ETIMEDOUT') > -1) {
						console.log(`connection is time out`);
					} else if (data_out.error.indexOf('ECONNREFUSED') > -1) {
                        console.log(`connection refused`);
					} else {
						console.error('other error:', data_out.error);
					}

					if (data_out?.data_in) {
						const new_proxy = get_proxy();
						console.log(`retry with new proxy: ${new_proxy.host}:${new_proxy.port}`);
						worker.postMessage({ data_in: data_out.data_in, proxy: new_proxy });
					} else {
						console.log('data_out', data_out)
						console.error('no data_in in response');
					}

					return;

				}

				if (data_out.proxy) {
					unlock_proxy(data_out.proxy.id);
				}


				actions.data_out.push(data_out);

				if (actions.data_in.length > 0) {
					
					worker.postMessage({ data_in: actions.data_in.pop(), proxy: get_proxy() });
					console.log( ( ((data_length - actions.data_in.length)/(data_length*1000))/10 ).toFixed(1), '%')
					
				} else {
					worker.terminate();
				}
				
			});

			worker.on('error', (error) => {
                console.log(`Worker encountered an error`);
				console.log(error);
            });
		}

		while (data_length !== actions.data_out.length) {
			await new Promise(resolve => setTimeout(resolve, 1000));
		}

		console.log ('data_out', actions.data_out.length);
		
		console.timeEnd('done');

		return actions.data_out;

	}
}
