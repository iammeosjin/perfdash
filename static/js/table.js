$(document).ready(function () {
	$('#issueTable').DataTable({
		responsive: true,
		'aaSorting': [[0, 'desc']],
		columnDefs: [
			{
				target: 0,
				visible: false,
				searchable: false,
			}
		],
	}).columns.adjust().responsive.recalc();

});

$(document).ready(function () {
	$('#pullRequestTable').DataTable({
		responsive: true,
		'aaSorting': [[0, 'desc']],
		columnDefs: [],
	}).columns.adjust().responsive.recalc();

});
