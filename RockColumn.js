function RockColumn(world, elevation, thickness, density){
	this.world = world;
	this.elevation = elevation;
	this.displacement = void 0;
	this.thickness = thickness;
	this.density = density;
}

RockColumn.prototype.isContinental = function(){
	return this.elevation > this.world.SEALEVEL;
}

RockColumn.prototype.accrete = function(subducted){
	sialDensity = this.world.land.density
	simaDensity = this.world.mantleDensity
	
	sialFraction = (subducted.density - simaDensity) / (sialDensity - simaDensity)
	
	thickness = this.thickness
	heightChange = subducted.thickness * sialFraction
	pressure = (thickness*this.density) +
			   (heightChange*sialDensity)
	density  = pressure / (thickness + heightChange)
	if(density > this.density) { console.log(this.density - density); }
	this.thickness += heightChange
	this.density = density
	this.isostacy();
}

RockColumn.prototype.isostacy = function(){
	//Calculates elevation as a function of crust density.
	//This was chosen as it only requires knowledge of crust density and thickness, 
	//which are relatively well known.
	thickness = this.thickness
	rootDepth = thickness * this.density / this.world.mantleDensity
	displacement = thickness - rootDepth
	this.displacement = displacement 
}