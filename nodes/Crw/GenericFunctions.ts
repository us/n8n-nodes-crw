import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	JsonObject,
} from 'n8n-workflow';
import { sleep } from 'n8n-workflow';

async function getBaseUrl(ctx: IExecuteFunctions): Promise<string> {
	const credentials = await ctx.getCredentials('crwApi');
	return (credentials.baseUrl as string).replace(/\/$/, '');
}

export async function crwApiRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
): Promise<JsonObject> {
	const baseUrl = await getBaseUrl(this);

	const response = await this.helpers.httpRequestWithAuthentication.call(
		this,
		'crwApi',
		{
			method,
			url: `${baseUrl}${endpoint}`,
			body,
			qs: query,
			json: true,
		},
	);

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

		await sleep(pollIntervalSec * 1000);
	}

	throw new Error(
		`Crawl job ${jobId} did not complete within ${maxWaitSec} seconds`,
	);
}
