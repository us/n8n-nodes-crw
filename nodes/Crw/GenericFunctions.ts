import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IRequestOptions,
	JsonObject,
} from 'n8n-workflow';

export async function crwApiRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
): Promise<JsonObject> {
	const credentials = await this.getCredentials('crwApi');
	const baseUrl = (credentials.baseUrl as string).replace(/\/$/, '');

	const options: IRequestOptions = {
		method,
		uri: `${baseUrl}${endpoint}`,
		body,
		qs: query,
		json: true,
		headers: {},
	};

	const apiKey = credentials.apiKey as string;
	if (apiKey) {
		options.headers!['Authorization'] = `Bearer ${apiKey}`;
	}

	const response = await this.helpers.request(options);

	if (response.success === false) {
		throw new Error(
			`CRW API error: ${response.error ?? 'Unknown error'} (${response.error_code ?? 'UNKNOWN'})`,
		);
	}

	return response as JsonObject;
}

export async function crwApiRequestWithPolling(
	this: IExecuteFunctions,
	jobId: string,
	pollIntervalSec: number,
	maxWaitSec: number,
): Promise<JsonObject> {
	const startTime = Date.now();
	const maxWaitMs = maxWaitSec * 1000;

	while (Date.now() - startTime < maxWaitMs) {
		const response = await crwApiRequest.call(
			this,
			'GET',
			`/v1/crawl/${jobId}`,
		);

		if (response.status === 'completed' || response.status === 'failed') {
			return response;
		}

		await new Promise<void>((resolve) => setTimeout(resolve, pollIntervalSec * 1000));
	}

	throw new Error(
		`Crawl job ${jobId} did not complete within ${maxWaitSec} seconds`,
	);
}
