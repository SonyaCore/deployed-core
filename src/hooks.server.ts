import { RateLimiter } from 'sveltekit-rate-limiter/server';
import { RATELIMIT_SECRET } from '$env/static/private';

if (!RATELIMIT_SECRET) throw new Error('Ratelimit secret key not provided');

const limiter = new RateLimiter({
	IP: [30, 'm'],
	IPUA: [10, 'm'],
	cookie: {
		name: 'client_id',
		secret: RATELIMIT_SECRET,
		rate: [4, 'm'],
		preflight: false
	}
});

export async function handle({ event, resolve }) {
	const originalGetClientAddress = event.getClientAddress;
	event.getClientAddress = () => {
		return event.request.headers.get('CF-Connecting-IP') || originalGetClientAddress();
	};

	if (await limiter.isLimited(event)) {
		return new Response('Too many requests', {
			status: 429,
			headers: {
				'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
				Pragma: 'no-cache',
				Expires: '0',
				'Surrogate-Control': 'no-store'
			}
		});
	}
	return resolve(event);
}
