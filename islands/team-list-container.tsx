import { DEFAULT_IMAGE } from '../libs/constants.ts';
import { Team } from '../types/common.ts';
interface Props {
	team: Team;
	date: string;
}

export default function TeamListContainer(props: Props) {
	return (
		<div
			onClick={() =>
				window.location =
					`/backends/${props.team}/${props.date}` as unknown as Location}
			class='flex items-center justify-between w-full p-2  hover:bg-gray-100 cursor-pointer border-2 rounded-lg'
		>
			<div class='flex items-center'>
				<div class='w-10 h-10 flex-shrink-0 mr-2 sm:mr-3'>
					<img
						class='rounded-full'
						src={DEFAULT_IMAGE}
						width='40'
						height='40'
					/>
				</div>

				<div class='flex flex-col'>
					<div class='text-sm leading-3 text-gray-700 font-bold w-full'>
						{props.team.toUpperCase()}
					</div>

					<div class='text-xs text-gray-600 w-full'>
						Lorem ipsum dolor sit amet, consectetur adipiscing elit.
					</div>
				</div>
			</div>
			{
				/*
			<svg
				class='h-6 w-6 mr-1 invisible md:visible lg:visible xl:visible'
				xmlns='http://www.w3.org/2000/svg'
				viewBox='0 0 20 20'
				fill='currentColor'
			>
				<path
					fill-rule='evenodd'
					d='M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z'
					clip-rule='evenodd'
				/>
			</svg> */
			}
		</div>
	);
}
