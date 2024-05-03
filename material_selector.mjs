export { open };

// DOM elements
var widget;
var widget_okay_button;
var widget_cancel_button;

var material_list;
var new_material_title;
var new_material_type;
var new_material_file_label;
var new_material_file;
var new_material_color;
var new_material_add;

var mesh_list;

// State
var res, rej;
var new_material_selected_file;
var materials;

// Functions
// TODO Add additional materials to an existing materials list
// TODO Remove material button from the material list
// TODO Different filters support
// TODO roughness and the like
//		maybe an advance material button ?
async function open(meshes) {
	// Check that it's not already open
	if (widget.style.visibility == 'visible')
		return null;
	widget.style.visibility = 'visible';


	// Clear material state
	materials = [];
	material_list.innerText = '';
	new_material_title.value = '';
	new_material_type.value = 'Image';
	new_material_file_label.style.display = 'block';
	new_material_color.style.display = 'none';
	new_material_file_label.innerText = 'No image selected';
	new_material_selected_file = undefined;

	// Populate mesh list
	mesh_list.innerText = '';
	for (const mesh of meshes) {
		const entry = document.createElement('div');

		const label = document.createElement('p');
		label.innerText = mesh;
		entry.appendChild(label);

		const material = document.createElement('select');
		const default_option = document.createElement('option');
		default_option.innerText = 'None';
		material.appendChild(default_option);
		entry.appendChild(material);

		mesh_list.appendChild(entry);
	}
	

	// Return a promise that terminates on a press of one of the main buttons
	return new Promise((n_res, n_rej) => { res = n_res, rej = n_rej });
}


function addMaterial() {
	// Validate input
	const title = new_material_title.value.trim();
	const type = new_material_type.value;
	if (title.length == 0) {
		alert('Must enter a material title');
		return;
	}
	if (type == 'Image' && new_material_selected_file == undefined) {
		alert('Must select an image.');
		return;
	}


	// TODO Ensure somewhere that the image loaded correctly
	// Add material to internal components
	const new_material = { title: title };
	if (type == 'Image') {
		new_material.image = new Promise((res, rej) => {
			const reader = new FileReader();
			reader.onload = _ => res(reader.result);
			reader.readAsArrayBuffer(new_material_selected_file);
		});
	} else {
		new_material.color = new_material_color.value;
	}
	materials.push(new_material);

	const new_material_div = document.createElement('div');
	const new_material_div_title = document.createElement('p');
	new_material_div_title.innerText = title;
	new_material_div.appendChild(new_material_div_title);
	material_list.appendChild(new_material_div);

	for (const mesh of mesh_list.children) {
		const new_option = document.createElement('option');
		new_option.innerText = title;
		new_option.value = materials.length - 1;
		mesh.children[1].appendChild(new_option);
	}

	// Clear input
	new_material_title.value = '';
	new_material_selected_file = undefined;
	new_material_file_label.innerText = 'No image selected';
}


async function okay() {
	widget.style.visibility = 'hidden';

	const assignments = [];
	for (const mesh of mesh_list.children) {
		assignments.push(mesh.children[1].value != 'None' ? Number(mesh.children[1].value)
			: undefined);
	}

	for (const material of materials) {
		if (material.image != undefined) {
			material.image = await material.image;
		} else {
			material.color = [
				Number('0x' + material.color.substr(1, 2)) / 255,
				Number('0x' + material.color.substr(3, 2)) / 255,
				Number('0x' + material.color.substr(5, 2)) / 255,
				1
			];
		}
	}

	res([materials, assignments]);
}

function cancel() {
	widget.style.visibility = 'hidden';
	res('Canceled');
}



// Load DOM elements and prepare them
document.addEventListener('DOMContentLoaded', () => {
	widget = document.getElementById('material-selector');
	widget_okay_button = document.getElementById('material-selector--main-buttons--okay');
	widget_cancel_button = document.getElementById('material-selector--main-buttons--cancel');

	material_list = document.getElementById('material-selector--material-list');
	new_material_title = document.getElementById('material-selector--new-material--title');
	new_material_type = document.getElementById('material-selector--new-material--type');
	new_material_file_label = document.getElementById('material-selector--new-material--file-label');
	new_material_file = document.getElementById('material-selector--new-material--file');
	new_material_color = document.getElementById('material-selector--new-material--color');
	new_material_add = document.getElementById('material-selector--new-material--add');

	mesh_list = document.getElementById('material-selector--mesh-list');

	widget_okay_button.onclick = okay;
	widget_cancel_button.onclick = cancel;

	new_material_type.onchange = () => {
		if (new_material_type.value == 'Image') {
			new_material_file_label.style.display = 'block';
			new_material_color.style.display = 'none';
		} else {
			new_material_file_label.style.display = 'none';
			new_material_color.style.display = 'block';
		}
	}
	new_material_file.onchange = () => {
		new_material_selected_file = new_material_file.files[0];
		new_material_file_label.innerText = new_material_selected_file.name;
	}
	new_material_add.onclick = addMaterial;
});
