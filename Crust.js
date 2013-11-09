function RockColumn(plate, elevation, densityOffset){
	this.elevation = elevation;
	this.density = densityOffset + plate.densityOffset;
}

RockColumn.prototype.isContinental = function(){
	return vertex.elevation > this.world.SEALEVEL;
}

function Crust(world){
	this.world = world;
}

Crust.prototype.create = function(vertex, elevation, densityOffset){
	vertex.setLength(elevation);
	vertex.content = new RockColumn(vertex.plate, elevation, densityOffset);
}

Crust.prototype.isContinental = function(vertex){
	return vertex.content && vertex.content.elevation > this.world.SEALEVEL;
	//return vertex.density > 2800;
}

Crust.prototype._canSubduct = function(top, bottom){
	if(top.content.elevation < bottom.content.elevation){
		return false;
	} else if(top.plate.densityOffset > bottom.plate.densityOffset){
		return false;
	} else {
		return true;
	}
}

Crust.prototype.collide = function(vertex1, vertex2){
	var top, bottom;
	if(this._canSubduct(vertex1, vertex2)){
		top = vertex1;
		bottom = vertex2;
	} else {
		bottom = vertex1;
		top = vertex2;
	}
	if (_.isUndefined(bottom.subductedBy)){
		bottom.subductedBy = top;
	}
	var subducting = bottom.subductedBy.clone().normalize(); 
	// NOTE: bottom.subductedBy is not always equivalent to top
	var subducted = bottom.clone().normalize();
	if (true){//subducted.distanceTo(subducting) > this.world.mountainWidth / this.world.radius){
		if(this.isContinental(bottom) && this.isContinental(top)){
			this.dock(top, bottom);
		} else {
			this.destroy(bottom);
			top.content.elevation = this.world.LAND;
		}
	} else {
		bottom.content.elevation = this.world.SUBDUCTED;
	}
}

Crust.prototype._canDock = function(dockingContinent, dockedToContinent){
	if(dockedToContinent.size() > dockingContinent.size()){
		return true;
	} else {
		return false;
	}
}

Crust.prototype.dock = function(top, bottom){
	var topContinent = top.plate.getContinent(top);
	var bottomContinent = top.plate.getContinent(bottom);
	var smallContinent, smallPlate, large, small;
	if(this._canDock(bottomContinent, topContinent)){
		large = top;
		small = bottom;
		smallContinent = bottomContinent;
	} else {
		large = bottom;
		small = top;
		smallContinent = topContinent;
	}
	large.plate.dock(large, small.plate, smallContinent);
}

Crust.prototype.replace = function(replaced, replacement){
	replaced.content = replacement.content;
	replaced.subductedBy = void 0;
}

Crust.prototype.destroy = function(vertex){
	vertex.content = void 0;
	vertex.subductedBy = void 0;
}