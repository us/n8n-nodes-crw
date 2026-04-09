import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { crwApiRequest, crwApiRequestWithPolling } from './GenericFunctions';

export class Crw implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'CRW',
		name: 'crw',
		icon: 'file:crw.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] }}',
		description:
			'Scrape, crawl, and extract web data with CRW — the open-source web scraper built for AI agents',
		defaults: {
			name: 'CRW',
		},
		inputs: ['main'],
		outputs: ['main'],
		usableAsTool: true,
		credentials: [
			{
				name: 'crwApi',
				required: true,
			},
		],
		properties: [
			// ------ Operation selector ------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Scrape',
						value: 'scrape',
						description: 'Scrape a single URL and return its content',
						action: 'Scrape a URL',
					},
					{
						name: 'Crawl',
						value: 'crawl',
						description: 'Crawl a website and return content from multiple pages',
						action: 'Crawl a website',
					},
					{
						name: 'Check Crawl Status',
						value: 'checkCrawlStatus',
						description: 'Check the status of a crawl job',
						action: 'Check crawl status',
					},
					{
						name: 'Cancel Crawl',
						value: 'cancelCrawl',
						description: 'Cancel a running crawl job',
						action: 'Cancel a crawl job',
					},
					{
						name: 'Map',
						value: 'map',
						description: 'Discover all URLs on a website',
						action: 'Map site URLs',
					},
					{
						name: 'Search',
						value: 'search',
						action: 'Search the web (cloud only)',
						description: 'Search the web and optionally scrape results. Cloud-only feature.',
					},
				],
				default: 'scrape',
			},

			// ------ Scrape fields ------
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'https://example.com',
				description: 'The URL to scrape',
				displayOptions: {
					show: {
						operation: ['scrape'],
					},
				},
			},
			{
				displayName: 'Output Formats',
				name: 'formats',
				type: 'multiOptions',
				options: [
					{ name: 'Markdown', value: 'markdown' },
					{ name: 'HTML', value: 'html' },
					{ name: 'Raw HTML', value: 'rawHtml' },
					{ name: 'Plain Text', value: 'plainText' },
					{ name: 'Links', value: 'links' },
					{ name: 'JSON (LLM Extract)', value: 'json' },
				],
				default: ['markdown'],
				description: 'Output formats to return',
				displayOptions: {
					show: {
						operation: ['scrape'],
					},
				},
			},
			{
				displayName: 'Only Main Content',
				name: 'onlyMainContent',
				type: 'boolean',
				default: true,
				description:
					'Whether to strip navigation, footer, sidebar and return only the main content',
				displayOptions: {
					show: {
						operation: ['scrape'],
					},
				},
			},
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						operation: ['scrape'],
					},
				},
				options: [
					{
						displayName: 'Render JavaScript',
						name: 'renderJs',
						type: 'options',
						options: [
							{ name: 'Auto', value: 'auto' },
							{ name: 'Force JS', value: 'force' },
							{ name: 'HTTP Only', value: 'http' },
						],
						default: 'auto',
						description: 'JavaScript rendering mode',
					},
					{
						displayName: 'Wait For (ms)',
						name: 'waitFor',
						type: 'number',
						default: 0,
						description:
							'Milliseconds to wait after page load before capturing content',
					},
					{
						displayName: 'CSS Selector',
						name: 'cssSelector',
						type: 'string',
						default: '',
						description: 'CSS selector to extract specific content',
					},
					{
						displayName: 'XPath',
						name: 'xpath',
						type: 'string',
						default: '',
						description: 'XPath expression to extract specific content',
					},
					{
						displayName: 'Include Tags',
						name: 'includeTags',
						type: 'string',
						default: '',
						description:
							'Comma-separated CSS selectors of elements to include',
					},
					{
						displayName: 'Exclude Tags',
						name: 'excludeTags',
						type: 'string',
						default: '',
						description:
							'Comma-separated CSS selectors of elements to exclude',
					},
					{
						displayName: 'Headers',
						name: 'headers',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								name: 'header',
								displayName: 'Header',
								values: [
									{
										displayName: 'Key',
										name: 'key',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
									},
								],
							},
						],
						description: 'Custom HTTP headers to send with the request',
					},
					{
						displayName: 'Proxy',
						name: 'proxy',
						type: 'string',
						default: '',
						description: 'Proxy URL to use for this request',
					},
					{
						displayName: 'Stealth Mode',
						name: 'stealth',
						type: 'boolean',
						default: false,
						description: 'Whether to enable stealth mode for this request',
					},
					{
						displayName: 'JSON Schema',
						name: 'jsonSchema',
						type: 'json',
						default: '',
						description:
							'JSON Schema for structured data extraction (requires "JSON" output format)',
					},
				],
			},

			// ------ Crawl fields ------
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'https://example.com',
				description: 'The starting URL to crawl',
				displayOptions: {
					show: {
						operation: ['crawl'],
					},
				},
			},
			{
				displayName: 'Max Depth',
				name: 'maxDepth',
				type: 'number',
				default: 2,
				description: 'Maximum link depth to crawl',
				displayOptions: {
					show: {
						operation: ['crawl'],
					},
				},
			},
			{
				displayName: 'Max Pages',
				name: 'maxPages',
				type: 'number',
				default: 100,
				description: 'Maximum number of pages to crawl',
				displayOptions: {
					show: {
						operation: ['crawl'],
					},
				},
			},
			{
				displayName: 'Output Formats',
				name: 'crawlFormats',
				type: 'multiOptions',
				options: [
					{ name: 'Markdown', value: 'markdown' },
					{ name: 'HTML', value: 'html' },
					{ name: 'Raw HTML', value: 'rawHtml' },
					{ name: 'Plain Text', value: 'plainText' },
					{ name: 'Links', value: 'links' },
				],
				default: ['markdown'],
				description: 'Output formats to return for each crawled page',
				displayOptions: {
					show: {
						operation: ['crawl'],
					},
				},
			},
			{
				displayName: 'Only Main Content',
				name: 'crawlOnlyMainContent',
				type: 'boolean',
				default: true,
				description:
					'Whether to strip navigation, footer, sidebar and return only the main content',
				displayOptions: {
					show: {
						operation: ['crawl'],
					},
				},
			},
			{
				displayName: 'Wait for Completion',
				name: 'waitForCompletion',
				type: 'boolean',
				default: true,
				description:
					'Whether to poll until the crawl finishes. If false, returns the job ID immediately.',
				displayOptions: {
					show: {
						operation: ['crawl'],
					},
				},
			},
			{
				displayName: 'Poll Interval (sec)',
				name: 'pollInterval',
				type: 'number',
				default: 5,
				description: 'Seconds between status checks',
				displayOptions: {
					show: {
						operation: ['crawl'],
						waitForCompletion: [true],
					},
				},
			},
			{
				displayName: 'Max Wait Time (sec)',
				name: 'maxWaitTime',
				type: 'number',
				default: 300,
				description: 'Maximum seconds to wait for the crawl to complete',
				displayOptions: {
					show: {
						operation: ['crawl'],
						waitForCompletion: [true],
					},
				},
			},

			// ------ Check Crawl Status fields ------
			{
				displayName: 'Crawl Job ID',
				name: 'crawlJobId',
				type: 'string',
				default: '',
				required: true,
				description: 'The ID of the crawl job to check',
				displayOptions: {
					show: {
						operation: ['checkCrawlStatus'],
					},
				},
			},

			// ------ Cancel Crawl fields ------
			{
				displayName: 'Crawl Job ID',
				name: 'cancelJobId',
				type: 'string',
				default: '',
				required: true,
				description: 'The ID of the crawl job to cancel',
				displayOptions: {
					show: {
						operation: ['cancelCrawl'],
					},
				},
			},

			// ------ Map fields ------
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'https://example.com',
				description: 'The URL to discover links from',
				displayOptions: {
					show: {
						operation: ['map'],
					},
				},
			},
			{
				displayName: 'Max Depth',
				name: 'mapMaxDepth',
				type: 'number',
				default: 2,
				description: 'Maximum link depth to discover',
				displayOptions: {
					show: {
						operation: ['map'],
					},
				},
			},
			{
				displayName: 'Use Sitemap',
				name: 'useSitemap',
				type: 'boolean',
				default: true,
				description: 'Whether to use the sitemap to discover URLs',
				displayOptions: {
					show: {
						operation: ['map'],
					},
				},
			},

			// ------ Search fields ------
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'web scraping best practices',
				description: 'The search query',
				displayOptions: {
					show: {
						operation: ['search'],
					},
				},
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 5,
				description: 'Maximum number of search results to return',
				displayOptions: {
					show: {
						operation: ['search'],
					},
				},
			},
			{
				displayName: 'Additional Options',
				name: 'searchOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						operation: ['search'],
					},
				},
				options: [
					{
						displayName: 'Language',
						name: 'lang',
						type: 'string',
						default: '',
						placeholder: 'en',
						description: 'Language code for search results',
					},
					{
						displayName: 'Time Filter',
						name: 'tbs',
						type: 'options',
						options: [
							{ name: 'Past Hour', value: 'qdr:h' },
							{ name: 'Past Day', value: 'qdr:d' },
							{ name: 'Past Week', value: 'qdr:w' },
							{ name: 'Past Month', value: 'qdr:m' },
							{ name: 'Past Year', value: 'qdr:y' },
						],
						default: 'qdr:d',
						description: 'Filter results by time range',
					},
					{
						displayName: 'Sources',
						name: 'sources',
						type: 'multiOptions',
						options: [
							{ name: 'Web', value: 'web' },
							{ name: 'News', value: 'news' },
							{ name: 'Images', value: 'images' },
						],
						default: [],
						description: 'Sources to search from',
					},
					{
						displayName: 'Scrape Results',
						name: 'scrapeResults',
						type: 'boolean',
						default: false,
						description: 'Whether to scrape the content of each search result',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				if (operation === 'scrape') {
					const url = this.getNodeParameter('url', i) as string;
					const formats = this.getNodeParameter('formats', i) as string[];
					const onlyMainContent = this.getNodeParameter(
						'onlyMainContent',
						i,
					) as boolean;
					const additionalOptions = this.getNodeParameter(
						'additionalOptions',
						i,
						{},
					) as IDataObject;

					const body: IDataObject = {
						url,
						formats,
						onlyMainContent,
					};

					// Map additional options to API fields
					if (additionalOptions.renderJs && additionalOptions.renderJs !== 'auto') {
						body.renderJs = additionalOptions.renderJs === 'force';
					}
					if (additionalOptions.waitFor) {
						body.waitFor = additionalOptions.waitFor;
					}
					if (additionalOptions.cssSelector) {
						body.cssSelector = additionalOptions.cssSelector;
					}
					if (additionalOptions.xpath) {
						body.xpath = additionalOptions.xpath;
					}
					if (additionalOptions.includeTags) {
						body.includeTags = (additionalOptions.includeTags as string)
							.split(',')
							.map((t: string) => t.trim());
					}
					if (additionalOptions.excludeTags) {
						body.excludeTags = (additionalOptions.excludeTags as string)
							.split(',')
							.map((t: string) => t.trim());
					}
					if (
						additionalOptions.headers &&
						(additionalOptions.headers as IDataObject).header
					) {
						const headerEntries = (
							additionalOptions.headers as IDataObject
						).header as Array<{ key: string; value: string }>;
						const headers: IDataObject = {};
						for (const entry of headerEntries) {
							if (entry.key) {
								headers[entry.key] = entry.value;
							}
						}
						if (Object.keys(headers).length > 0) {
							body.headers = headers;
						}
					}
					if (additionalOptions.proxy) {
						body.proxy = additionalOptions.proxy;
					}
					if (additionalOptions.stealth) {
						body.stealth = additionalOptions.stealth;
					}
					if (additionalOptions.jsonSchema) {
						try {
							body.jsonSchema = JSON.parse(
								additionalOptions.jsonSchema as string,
							);
						} catch {
							throw new Error('Invalid JSON Schema — must be valid JSON');
						}
					}

					const response = await crwApiRequest.call(
						this,
						'POST',
						'/v1/scrape',
						body,
					);
					returnData.push({ json: response });
				} else if (operation === 'crawl') {
					const url = this.getNodeParameter('url', i) as string;
					const maxDepth = this.getNodeParameter('maxDepth', i) as number;
					const maxPages = this.getNodeParameter('maxPages', i) as number;
					const formats = this.getNodeParameter(
						'crawlFormats',
						i,
					) as string[];
					const onlyMainContent = this.getNodeParameter(
						'crawlOnlyMainContent',
						i,
					) as boolean;
					const waitForCompletion = this.getNodeParameter(
						'waitForCompletion',
						i,
					) as boolean;

					const body: IDataObject = {
						url,
						maxDepth,
						maxPages,
						formats,
						onlyMainContent,
					};

					const response = await crwApiRequest.call(
						this,
						'POST',
						'/v1/crawl',
						body,
					);

					if (!waitForCompletion) {
						returnData.push({ json: response });
					} else {
						const pollInterval = this.getNodeParameter(
							'pollInterval',
							i,
						) as number;
						const maxWaitTime = this.getNodeParameter(
							'maxWaitTime',
							i,
						) as number;
						const jobId = response.id as string;

						const result = await crwApiRequestWithPolling.call(
							this,
							jobId,
							pollInterval,
							maxWaitTime,
						);

						if (result.status === 'failed') {
							throw new Error(
								`Crawl job ${jobId} failed: ${result.error ?? 'Unknown error'}`,
							);
						}

						// Return each crawled page as a separate item
						const pages = (result.data as unknown as IDataObject[]) ?? [];
						if (pages.length > 0) {
							for (const page of pages) {
								returnData.push({ json: page });
							}
						} else {
							returnData.push({ json: result });
						}
					}
				} else if (operation === 'checkCrawlStatus') {
					const jobId = this.getNodeParameter('crawlJobId', i) as string;

					const response = await crwApiRequest.call(
						this,
						'GET',
						`/v1/crawl/${jobId}`,
					);

					// Return each page as a separate item if data exists
					const pages = (response.data as unknown as IDataObject[]) ?? [];
					if (pages.length > 0) {
						for (const page of pages) {
							returnData.push({
								json: {
									status: response.status,
									total: response.total,
									completed: response.completed,
									...page,
								} as IDataObject,
							});
						}
					} else {
						returnData.push({ json: response });
					}
				} else if (operation === 'cancelCrawl') {
					const jobId = this.getNodeParameter('cancelJobId', i) as string;

					const response = await crwApiRequest.call(
						this,
						'DELETE',
						`/v1/crawl/${jobId}`,
					);
					returnData.push({ json: response });
				} else if (operation === 'map') {
					const url = this.getNodeParameter('url', i) as string;
					const maxDepth = this.getNodeParameter('mapMaxDepth', i) as number;
					const useSitemap = this.getNodeParameter(
						'useSitemap',
						i,
					) as boolean;

					const body: IDataObject = {
						url,
						maxDepth,
						useSitemap,
					};

					const response = await crwApiRequest.call(
						this,
						'POST',
						'/v1/map',
						body,
					);

					// Return each link as a separate item
					const links = (response.links as unknown as string[]) ?? [];
					if (links.length > 0) {
						for (const link of links) {
							returnData.push({ json: { url: link } });
						}
					} else {
						returnData.push({ json: response });
					}
				} else if (operation === 'search') {
					const query = this.getNodeParameter('query', i) as string;
					const limit = this.getNodeParameter('limit', i) as number;
					const options = this.getNodeParameter('searchOptions', i) as IDataObject;

					const body: IDataObject = { query, limit };
					if (options.lang) body.lang = options.lang;
					if (options.tbs) body.tbs = options.tbs;
					if (options.sources && (options.sources as string[]).length > 0) {
						body.sources = options.sources;
					}
					if (options.scrapeResults) {
						body.scrapeOptions = { formats: ['markdown'] };
					}

					const response = await crwApiRequest.call(
						this,
						'POST',
						'/v1/search',
						body,
					);

					const data = response.data;
					if (Array.isArray(data)) {
						for (const result of data) {
							returnData.push({ json: result as IDataObject });
						}
					} else {
						returnData.push({ json: response });
					}
				}
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: { error: (error as Error).message },
						});
						continue;
					}
					throw error;
				}
		}

		return [returnData];
	}
}
