import pastLives from './assets/past-lives.jpg';
import her from './assets/her.jpg';
import budapest from './assets/grand-budapest.jpg';
import dune from './assets/dune.jpg';
import parasite from './assets/parasite.jpg';
import pastBackdrop from './assets/past-lives-backdrop.jpg';
import herBackdrop from './assets/her-backdrop.jpg';
import budapestBackdrop from './assets/grand-budapest-backdrop.jpg';
import duneBackdrop from './assets/dune-backdrop.jpg';
import parasiteBackdrop from './assets/parasite-backdrop.jpg';

export const movies = [
	{
		id: 1,
		title: 'Past Lives',
		year: '2023',
		duration: '1h 46m',
		genre: 'Drama / Romance',
		director: 'Céline Song',
		image: pastLives,
		backdrop: pastBackdrop,
		score: '4.3',
		description:
			'Two childhood friends reunite in New York after twenty years apart. A quiet story about the lives we choose, and the ones we leave behind.'
	},
	{
		id: 2,
		title: 'Her',
		year: '2013',
		duration: '2h 6m',
		genre: 'Drama / Romance',
		director: 'Spike Jonze',
		image: her,
		backdrop: herBackdrop,
		score: '4.1',
		description:
			'A lonely writer develops an unexpected connection with an operating system. About love, loneliness, and what it means to be here.'
	},
	{
		id: 3,
		title: 'The Grand Budapest Hotel',
		year: '2014',
		duration: '1h 40m',
		genre: 'Comedy / Adventure',
		director: 'Wes Anderson',
		image: budapest,
		backdrop: budapestBackdrop,
		score: '4.2',
		description:
			'A legendary concierge and his lobby boy become unlikely friends in a very particular hotel, in a world on the brink of change.'
	},
	{
		id: 4,
		title: 'Dune',
		year: '2021',
		duration: '2h 35m',
		genre: 'Science fiction',
		director: 'Denis Villeneuve',
		image: dune,
		backdrop: duneBackdrop,
		score: '4.0',
		description:
			'Paul Atreides travels to the desert planet Arrakis, where a struggle over its most valuable resource will change his life.'
	},
	{
		id: 5,
		title: 'Parasite',
		year: '2019',
		duration: '2h 12m',
		genre: 'Thriller / Drama',
		director: 'Bong Joon-ho',
		image: parasite,
		backdrop: parasiteBackdrop,
		score: '4.5',
		description:
			'Two families, one house, and a carefully maintained boundary between their lives. Nothing stays on its own side for long.'
	}
];
