import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class CrwApi implements ICredentialType {
	name = 'crwApi';
	displayName = 'CRW API';
	documentationUrl = 'https://fastcrw.com/docs/rest-api';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://fastcrw.com/api',
			placeholder: 'https://fastcrw.com/api or http://localhost:3000',
			description:
				'CRW server URL. Use https://fastcrw.com/api for cloud or your self-hosted URL.',
			required: true,
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'Bearer token for authentication. Leave empty if your self-hosted instance has no auth.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/health',
			method: 'GET',
		},
	};
}
