import { User } from '../types/common.ts';
import { DEFAULT_IMAGE } from '../libs/constants.ts';

export function UserImageHolder(props: { user: User }) {
	const { user } = props;
	return (
		<div class='flex items-center'>
			<div class='w-10 h-10 flex-shrink-0 mr-2 sm:mr-3'>
				<img
					class='rounded-full'
					src={user
						.image ||
						DEFAULT_IMAGE}
					width='40'
					height='40'
				/>
			</div>
			<div class='font-medium text-gray-800'>
				{user.name}
			</div>
		</div>
	);
}
