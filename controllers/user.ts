// @deno-types=npm:@types/bluebird
import Bluebird from 'npm:bluebird';
import { User } from '../types/common.ts';
import JiraUserModel from '../models/jira-user.ts';
import GithubUserModel from '../models/github-user.ts';
import UserModel from '../models/user.ts';
import ClickupUserModel from '../models/clickup-user.ts';

const userCache = new Map<string, User | null>();

export async function createUser(user: User) {
	if (!user.name) {
		return new Response('Name is required', {
			status: 400,
		});
	}

	const username = user.name.replaceAll(' ', '-').replaceAll('.', '')
		.toLowerCase();

	if (user.jira) {
		await JiraUserModel.insert({
			id: [user.jira],
			user: [username],
		});
	}

	if (user.github) {
		await GithubUserModel.insert({
			id: [user.github],
			user: [username],
		});
	}

	if (user.clickup) {
		await ClickupUserModel.insert({
			id: [user.clickup],
			user: [username],
		});
	}

	await UserModel.insert({
		...user,
		username,
		id: [username],
	});
}

export async function bulkCreateUsers(users: User[]) {
	await Bluebird.map(users, (user) => createUser(user));
}

export async function getUserByGithubHandle(handle: string) {
	let user = userCache.get(handle);
	if (!user) {
		const githubUser = await GithubUserModel.get([handle]);
		if (!githubUser) {
			return null;
		}

		user = await UserModel.get(githubUser.user);
		if (!user) {
			return null;
		}
	}

	return user;
}

export async function getUserByJiraHandle(handle: string) {
	let user = userCache.get(handle);

	if (!user) {
		const jiraUser = await JiraUserModel.get([handle]);
		if (!jiraUser) {
			return null;
		}

		user = await UserModel.get(jiraUser.user);
		if (!user) {
			return null;
		}
	}

	return user;
}

export async function getUserByClickupHandle(handle: string) {
	let user = userCache.get(handle);

	if (!user) {
		const clickupUser = await ClickupUserModel.get([handle]);
		if (!clickupUser) {
			return null;
		}

		user = await UserModel.get(clickupUser.user);
	}

	return user;
}
