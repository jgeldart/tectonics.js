var vertexShaders = {};
vertexShaders.equirectangular = `
const float PI = 3.14159265358979;
const float INDEX_SPACING = PI * 0.75; // anything from 0.0 to 2.*PI
attribute float displacement;
attribute float plant_coverage;
attribute float ice_coverage;
attribute float insolation;
attribute float scalar;
attribute float vector_fraction_traversed;
attribute vec3 vector;
varying float vDisplacement;
varying float vPlantCoverage;
varying float vIceCoverage;
varying float vInsolation;
varying float vScalar;
varying float vVectorFractionTraversed;
varying vec4 vPosition;
uniform float sealevel;
// radius of the world to be rendered
uniform float world_radius;
// radius of a reference world, generally the focus of the scene
uniform float reference_distance;
uniform float index;
uniform float animation_phase_angle;
float lon(vec3 pos) {
 return atan(-pos.z, pos.x) + PI;
}
float lat(vec3 pos) {
 return asin(pos.y / length(pos));
}
void main() {
 vDisplacement = displacement;
 vPlantCoverage = plant_coverage;
 vIceCoverage = ice_coverage;
 vInsolation = insolation;
 vScalar = scalar;
 vPosition = modelMatrix * vec4( position, 1.0 );
 vec4 modelPos = modelMatrix * vec4( ( position ), 1.0 );
 float height = displacement > sealevel? 0.005 : 0.0;
 float index_offset = INDEX_SPACING * index;
 float focus = lon(cameraPosition) + index_offset;
 float lon_focused = mod(lon(modelPos.xyz) - focus, 2.*PI) - PI;
 float lat_focused = lat(modelPos.xyz); //+ (index*PI);
 bool is_on_edge = lon_focused > PI*0.9 || lon_focused < -PI*0.9;
 vec4 displaced = vec4(
  lon_focused + index_offset,
  lat(modelPos.xyz), //+ (index*PI), 
  is_on_edge? 0. : length(position),
  1);
 mat4 scaleMatrix = mat4(1);
 scaleMatrix[3] = viewMatrix[3] * reference_distance / world_radius;
 gl_Position = projectionMatrix * scaleMatrix * displaced;
}
`;
vertexShaders.texture = `
const float PI = 3.14159265358979;
const float INDEX_SPACING = PI * 0.75; // anything from 0.0 to 2.*PI
attribute float displacement;
attribute float plant_coverage;
attribute float ice_coverage;
attribute float insolation;
attribute float scalar;
attribute float vector_fraction_traversed;
attribute vec3 vector;
varying float vDisplacement;
varying float vPlantCoverage;
varying float vIceCoverage;
varying float vInsolation;
varying float vScalar;
varying float vVectorFractionTraversed;
varying vec4 vPosition;
uniform float sealevel;
// radius of the world to be rendered
uniform float world_radius;
// radius of a reference world, generally the focus of the scene
uniform float reference_distance;
uniform float index;
uniform float animation_phase_angle;
uniform float insolation_max;
float lon(vec3 pos) {
 return atan(-pos.z, pos.x) + PI;
}
float lat(vec3 pos) {
 return asin(pos.y / length(pos));
}
void main() {
 vDisplacement = displacement;
 vPlantCoverage = plant_coverage;
 vIceCoverage = ice_coverage;
 vInsolation = insolation_max; // always use "insolation_max" for textures
 vScalar = scalar;
 vPosition = modelMatrix * vec4( position, 1.0 );
 vec4 modelPos = modelMatrix * vec4( ( position ), 1.0 );
 float index_offset = INDEX_SPACING * index;
 float focus = lon(cameraPosition) + index_offset;
 float lon_focused = mod(lon(modelPos.xyz) - focus, 2.*PI) - PI + index_offset;
 float lat_focused = lat(modelPos.xyz); //+ (index*PI);
 float height = displacement > sealevel? 0.005 : 0.0;
 gl_Position = vec4(
        lon_focused / PI,
  lat_focused / (PI/2.),
  -height,
  1);
}
`;
vertexShaders.orthographic = `
const float PI = 3.14159265358979;
const float INDEX_SPACING = PI * 0.75; // anything from 0.0 to 2.*PI
attribute float displacement;
attribute float plant_coverage;
attribute float ice_coverage;
attribute float insolation;
attribute float scalar;
attribute float vector_fraction_traversed;
attribute vec3 vector;
varying float vDisplacement;
varying float vPlantCoverage;
varying float vIceCoverage;
varying float vInsolation;
varying float vScalar;
varying float vVectorFractionTraversed;
varying vec4 vPosition;
uniform float sealevel;
// radius of the world to be rendered
uniform float world_radius;
// radius of a reference world, generally the focus of the scene
uniform float reference_distance;
uniform float index;
uniform float animation_phase_angle;
void main() {
 vDisplacement = displacement;
 vPlantCoverage = plant_coverage;
 vIceCoverage = ice_coverage;
 vInsolation = insolation;
 vScalar = scalar;
 vVectorFractionTraversed = vector_fraction_traversed;
 vPosition = modelMatrix * vec4( position, 1.0 );
 float surface_height = max(displacement - sealevel, 0.);
 vec4 displacement = vec4( position * (world_radius + surface_height) / reference_distance, 1.0 );
 gl_Position = projectionMatrix * modelViewMatrix * displacement;
}
`;
vertexShaders.passthrough = `
varying vec2 vUv;
void main() {
 vUv = uv;
 gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`;
var fragmentShaders = {};
fragmentShaders.realistic = `
varying float vDisplacement;
varying float vPlantCoverage;
varying float vIceCoverage;
varying float vInsolation;
varying float vScalar;
varying vec4 vPosition;
uniform float sealevel;
uniform float sealevel_mod;
uniform float darkness_mod;
uniform float ice_mod;
uniform float insolation_max;
const vec4 NONE = vec4(0.0,0.0,0.0,0.0);
const vec4 OCEAN = vec4(0.04,0.04,0.2,1.0);
const vec4 SHALLOW = vec4(0.04,0.58,0.54,1.0);
const vec4 MAFIC = vec4(50,45,50,255)/255. // observed on lunar maria 
                  * vec4(1,1,1,1); // aesthetic correction 
const vec4 FELSIC = vec4(214,181,158,255)/255. // observed color of rhyolite sample
                  * vec4(1,1,1,1); // aesthetic correction 
//const vec4 SAND = vec4(255,230,155,255)/255.;
const vec4 SAND = vec4(245,215,145,255)/255.;
const vec4 PEAT = vec4(100,85,60,255)/255.;
const vec4 SNOW = vec4(0.9, 0.9, 0.9, 0.9);
const vec4 JUNGLE = vec4(30,50,10,255)/255.;
//const vec4 JUNGLE = vec4(20,45,5,255)/255.;
void main() {
 float epipelagic = sealevel - 200.0;
 float mesopelagic = sealevel - 1000.0;
 float abyssopelagic = sealevel - 4000.0;
 float maxheight = sealevel + 10000.0;
 float lat = (asin(abs(vPosition.y)));
 float felsic_coverage = smoothstep(abyssopelagic, sealevel+5000., vDisplacement);
 float mineral_coverage = vDisplacement > sealevel? smoothstep(maxheight, sealevel, vDisplacement) : 0.;
 float organic_coverage = degrees(lat)/90.; // smoothstep(30., -30., temp); 
 float ice_coverage = vIceCoverage;
 float plant_coverage = vPlantCoverage * (vDisplacement > sealevel? 1. : 0.);
 float ocean_coverage = smoothstep(epipelagic * sealevel_mod, sealevel * sealevel_mod, vDisplacement);
 float darkness_coverage = smoothstep(insolation_max, 0., vInsolation);
 vec4 ocean = mix(OCEAN, SHALLOW, ocean_coverage);
 vec4 bedrock = mix(MAFIC, FELSIC, felsic_coverage);
 vec4 soil = mix(bedrock, mix(SAND, PEAT, organic_coverage), mineral_coverage);
 vec4 canopy = mix(soil, JUNGLE, plant_coverage);
 vec4 uncovered = @UNCOVERED;
 vec4 sea_covered = vDisplacement < sealevel * sealevel_mod? ocean : uncovered;
 vec4 ice_covered = mix(sea_covered, SNOW, ice_coverage*ice_mod);
 vec4 darkness_covered = mix(ice_covered, NONE, darkness_coverage*darkness_mod-0.01);
 gl_FragColor = darkness_covered;
}
`;
fragmentShaders.monochromatic = `
varying float vDisplacement;
varying float vPlantCoverage;
varying float vIceCoverage;
varying float vInsolation;
varying float vScalar;
varying vec4 vPosition;
uniform float sealevel;
uniform float sealevel_mod;
void main() {
 vec4 uncovered = mix(
  vec4(@MINCOLOR,1.),
  vec4(@MAXCOLOR,1.),
  vScalar
 );
 vec4 ocean = mix(vec4(0.), uncovered, 0.5);
 vec4 sea_covered = vDisplacement < sealevel * sealevel_mod? ocean : uncovered;
 gl_FragColor = sea_covered;
}
`;
fragmentShaders.heatmap = `
varying float vDisplacement;
varying float vPlantCoverage;
varying float vIceCoverage;
varying float vInsolation;
varying float vScalar;
varying vec4 vPosition;
uniform float sealevel;
uniform float sealevel_mod;
//converts float from 0-1 to a heat map visualtion
//credit goes to Gaëtan Renaudeau: http://greweb.me/glsl.js/examples/heatmap/
vec4 heat (float v) {
 float value = 1.-v;
 return (0.5+0.5*smoothstep(0.0, 0.1, value))*vec4(
  smoothstep(0.5, 0.3, value),
  value < 0.3 ? smoothstep(0.0, 0.3, value) : smoothstep(1.0, 0.6, value),
  smoothstep(0.4, 0.6, value),
  1
 );
}
void main() {
 vec4 uncovered = heat( vScalar );
 vec4 ocean = mix(vec4(0.), uncovered, 0.5);
 vec4 sea_covered = vDisplacement < sealevel * sealevel_mod? ocean : uncovered;
 gl_FragColor = sea_covered;
}
`;
fragmentShaders.topographic = `
varying float vDisplacement;
varying float vPlantCoverage;
varying float vIceCoverage;
varying float vInsolation;
varying float vScalar;
varying vec4 vPosition;
uniform float sealevel;
uniform float sealevel_mod;
//converts a float ranging from [-1,1] to a topographic map visualization
//credit goes to Gaëtan Renaudeau: http://greweb.me/glsl.js/examples/heatmap/
void main() {
    //deep ocean
    vec3 color = vec3(0,0,0.8);
    //shallow ocean
    color = mix(
        color,
        vec3(0.5,0.5,1),
        smoothstep(-1., -0.01, vScalar)
    );
    //lowland
    color = mix(
        color,
        vec3(0,0.55,0),
        smoothstep(-0.01, 0.01, vScalar)
    );
    //highland
    color = mix(
        color,
        vec3(0.95,0.95,0),
        smoothstep(0., 0.45, vScalar)
    );
    //mountain
    color = mix(
        color,
        vec3(0.5,0.5,0),
        smoothstep(0.2, 0.7, vScalar)
    );
    //mountain
    color = mix(
        color,
        vec3(0.5,0.5,0.5),
        smoothstep(0.4, 0.8, vScalar)
    );
    //snow cap
    color = mix(
        color,
        vec3(0.95),
        smoothstep(0.75, 1., vScalar)
    );
 gl_FragColor = vec4(color, 1.);
}
`;
fragmentShaders.vectorField = `
const float PI = 3.14159265358979;
uniform float animation_phase_angle;
varying float vVectorFractionTraversed;
void main() {
 float state = (cos(2.*PI*vVectorFractionTraversed - animation_phase_angle) + 1.) / 2.;
 gl_FragColor = vec4(state) * vec4(vec3(0.8),0.) + vec4(vec3(0.2),0.);
}
`;
fragmentShaders.atmosphere = `
// TODO: try to get this to work with structs!
// See: http://www.lighthouse3d.com/tutorials/maths/ray-sphere-intersection/
void get_relation_between_ray_and_point(
 in vec3 ray_origin,
 in vec3 ray_direction,
 in vec3 point_position,
 out float distance_at_closest_approach2,
 out float distance_to_closest_approach
){
 vec3 ray_to_point = point_position - ray_origin;
 distance_to_closest_approach = dot(ray_to_point, ray_direction);
 distance_at_closest_approach2 =
  dot(ray_to_point, ray_to_point) -
  distance_to_closest_approach * distance_to_closest_approach;
}
bool try_get_relation_between_ray_and_sphere(
 in vec3 ray_origin,
 in vec3 ray_direction,
 in vec3 sphere_origin,
 in float sphere_radius,
 out float distance_at_closest_approach2,
 out float distance_to_closest_approach,
 out float distance_to_entrance,
 out float distance_to_exit
){
 get_relation_between_ray_and_point(
  ray_origin, ray_direction,
  sphere_origin,
  distance_at_closest_approach2, distance_to_closest_approach
 );
 float sphere_radius2 = sphere_radius * sphere_radius;
 if (distance_at_closest_approach2 > sphere_radius2)
  return false;
 float distance_from_closest_approach_to_exit = sqrt(sphere_radius2 - distance_at_closest_approach2);
 distance_to_entrance = distance_to_closest_approach - distance_from_closest_approach_to_exit;
 distance_to_exit = distance_to_closest_approach + distance_from_closest_approach_to_exit;
 return true;
}
const float DEGREE = 3.141592653589793238462643383279502884197169399/180.;
const float RADIAN = 1.;
const float KELVIN = 1.;
const float MICROGRAM = 1e-9; // kilograms
const float MILLIGRAM = 1e-6; // kilograms
const float GRAM = 1e-3; // kilograms
const float KILOGRAM = 1.; // kilograms
const float TON = 1000.; // kilograms
const float NANOMETER = 1e-9; // meter
const float MICROMETER = 1e-6; // meter
const float MILLIMETER = 1e-3; // meter
const float METER = 1.; // meter
const float KILOMETER = 1000.; // meter
const float MOLE = 6.02214076e23;
const float MILLIMOLE = MOLE / 1e3;
const float MICROMOLE = MOLE / 1e6;
const float NANOMOLE = MOLE / 1e9;
const float FEMTOMOLE = MOLE / 1e12;
const float SECOND = 1.; // seconds
const float MINUTE = 60.; // seconds
const float HOUR = MINUTE*60.; // seconds
const float DAY = HOUR*24.; // seconds
const float WEEK = DAY*7.; // seconds
const float MONTH = DAY*29.53059; // seconds
const float YEAR = DAY*365.256363004; // seconds
const float MEGAYEAR = YEAR*1e6; // seconds
const float NEWTON = KILOGRAM * METER / (SECOND * SECOND);
const float JOULE = NEWTON * METER;
const float WATT = JOULE / SECOND;
const float EARTH_MASS = 5.972e24; // kilograms
const float EARTH_RADIUS = 6.367e6; // meters
const float STANDARD_GRAVITY = 9.80665; // meters/second^2
const float STANDARD_TEMPERATURE = 273.15; // kelvin
const float STANDARD_PRESSURE = 101325.; // pascals
const float ASTRONOMICAL_UNIT = 149597870700.; // meters
const float GLOBAL_SOLAR_CONSTANT = 1361.; // watts/meter^2
const float JUPITER_MASS = 1.898e27; // kilograms
const float JUPITER_RADIUS = 71e6; // meters
const float SOLAR_MASS = 2e30; // kilograms
const float SOLAR_RADIUS = 695.7e6; // meters
const float SOLAR_LUMINOSITY = 3.828e26; // watts
const float SOLAR_TEMPERATURE = 5772.; // kelvin
// "GAMMA" is the constant that's used to map between 
//   rgb signals sent to a monitor and their actual intensity
const float GAMMA = 2.2;
const float PI = 3.14159265358979323846264338327950288419716939937510;
const float SPEED_OF_LIGHT = 299792458. * METER / SECOND;
const float BOLTZMANN_CONSTANT = 1.3806485279e-23 * JOULE / KELVIN;
const float STEPHAN_BOLTZMANN_CONSTANT = 5.670373e-8 * WATT / (METER*METER* KELVIN*KELVIN*KELVIN*KELVIN);
const float PLANCK_CONSTANT = 6.62607004e-34 * JOULE * SECOND;
//EMISSION----------------------------------------------------------------------
float get_rayleigh_phase_factor(float mu)
{
 return
   3. * (1. + mu*mu)
 / //------------------------
    (16. * PI);
}
// Henyey-Greenstein phase function factor [-1, 1]
// represents the average cosine of the scattered directions
// 0 is isotropic scattering
// > 1 is forward scattering, < 1 is backwards
const float g = 0.76;
float get_henyey_greenstein_phase_factor(float mu)
{
 return
      (1. - g*g)
 / //---------------------------------------------
  ((4. + PI) * pow(1. + g*g - 2.*g*mu, 1.5));
}
// Schlick Phase Function factor
// Pharr and  Humphreys [2004] equivalence to g above
const float k = 1.55*g - 0.55 * (g*g*g);
float get_schlick_phase_factor(float mu)
{
 return
     (1. - k*k)
 / //-------------------------------------------
  (4. * PI * (1. + k*mu) * (1. + k*mu));
}
//RADIATION---------------------------------------------------------------------
// This function determines the fraction of a black body's emission that fall 
// under a certain wavelength
// see Lawson 2004, "The Blackbody Fraction, Infinite Series and Spreadsheets"
float solve_black_body_fraction_below_wavelength(float wavelength, float temperature){
 const float iterations = 2.;
 const float h = PLANCK_CONSTANT;
 const float k = BOLTZMANN_CONSTANT;
 const float c = SPEED_OF_LIGHT;
 float L = wavelength;
 float T = temperature;
 float C2 = h*c/k;
 float z = C2 / (L*T);
 float z2 = z*z;
 float z3 = z2*z;
 float sum = (z3 + 3.*z2 + 6.*z + 6.) * exp(-z);
 return 15.*sum/(PI*PI*PI*PI);
}
// This function determines the fraction of a black body's emission that fall 
// within a certain range of wavelengths
float solve_black_body_fraction_between_wavelengths(float lo, float hi, float temperature){
 return solve_black_body_fraction_below_wavelength(hi, temperature) -
   solve_black_body_fraction_below_wavelength(lo, temperature);
}
// This function calculates the radiation (in watts/m^2) that's emitted by
// a single black body object using the Stephan-Boltzmann equation
float get_black_body_emissive_flux(float temperature){
    float T = temperature;
    return STEPHAN_BOLTZMANN_CONSTANT * T*T*T*T;
}
// This function returns a rgb vector that quickly approximates a spectral "bump".
// Adapted from GPU Gems and Alan Zucconi
// from https://www.alanzucconi.com/2017/07/15/improving-the-rainbow/
float bump (float x, float edge0, float edge1, float height)
{
    float center = (edge1 + edge0) / 2.;
    float width = (edge1 - edge0) / 2.;
    float offset = (x - center) / width;
 return height * max(1. - offset * offset, 0.);
}
//HUMAN-PERCEPTION--------------------------------------------------------------
// This function returns a rgb vector that best represents color at a given wavelength
// It is from Alan Zucconi: https://www.alanzucconi.com/2017/07/15/improving-the-rainbow/
// I've adapted the function so that coefficients are expressed in meters.
vec3 get_rgb_signal_of_wavelength (float w)
{
 return vec3(
        bump(w, 530e-9, 690e-9, 1.00)+
        bump(w, 410e-9, 460e-9, 0.15),
        bump(w, 465e-9, 635e-9, 0.75)+
        bump(w, 420e-9, 700e-9, 0.15),
        bump(w, 400e-9, 570e-9, 0.45)+
        bump(w, 570e-9, 625e-9, 0.30)
      );
}
// ELECTRONICS
vec3 get_rgb_intensity_of_rgb_signal(vec3 signal)
{
 return vec3(
  pow(signal.x, GAMMA),
  pow(signal.y, GAMMA),
  pow(signal.z, GAMMA)
 );
}
vec3 get_rgb_signal_of_rgb_intensity(vec3 intensity)
{
 return vec3(
  pow(intensity.x, 1./GAMMA),
  pow(intensity.y, 1./GAMMA),
  pow(intensity.z, 1./GAMMA)
 );
}
varying vec2 vUv;
uniform sampler2D surface_light;
// Determines the length of a unit of distance within the view, in meters, 
// it is generally the radius of whatever planet's the focus for the scene.
// The view uses different units for length to prevent certain issues with
// floating point precision. 
uniform float reference_distance;
uniform mat4 projection_matrix_inverse;
uniform mat4 view_matrix_inverse;
// location for the center of the world, in meters
// currently stuck at 0. until we support multi-planet renders
uniform vec3 world_position;
// radius of the world being rendered, in meters
uniform float world_radius;
//TODO: turn these into uniforms!
// temperature of the star, in kelvin
const float star_temperature = SOLAR_TEMPERATURE;
// location for the center of the star, in meters
const vec3 star_position = vec3(1, 0, 0);
// total power output of the star
const float star_luminosity = SOLAR_LUMINOSITY;
// scattering coefficients at sea level, in meters
// we use vec3 to represent rgb color channels
const vec3 betaR = vec3(5.5e-6, 13.0e-6, 22.4e-6); // Rayleigh 
const vec3 betaM = vec3(21e-6); // Mie
// scale height (m)
// thickness of the atmosphere if its density were uniform
// we use a vec2: x is rayleigh scattering, y is mie scattering
const vec2 scale_heights = vec2(7994, 1200);
// maximum number of samples we alot ourselves for a single pixel
// considers samples taken across all stars
const int SAMPLE_BUDGET = 128;
const int SAMPLE_COUNT = 16;
const int SAMPLE_COUNT_LIGHT = 8;
void main() {
 vec4 surface_color = texture2D( surface_light, vUv );
 vec2 screenspace = vUv;
    vec2 clipspace = 2.0 * screenspace - 1.0;
 vec3 ray_direction = normalize(view_matrix_inverse * projection_matrix_inverse * vec4(clipspace, 1, 1)).xyz;
 vec3 ray_origin = view_matrix_inverse[3].xyz * reference_distance;
 // ray_origin ;
 // NOTE: 3 scale heights should capture 95% of the atmosphere's mass, 
 //   enough to be aesthetically appealing.
 float atmosphere_height = 3. * max(scale_heights.x, scale_heights.y);
 // Determine relevant metrics for calculating optical depth.
 float distance_at_closest_approach2, distance_to_closest_approach;
 float distance_to_entrance, distance_to_exit;
 bool is_interaction = try_get_relation_between_ray_and_sphere(
  ray_origin, ray_direction,
  world_position, world_radius + atmosphere_height,
  distance_at_closest_approach2, distance_to_closest_approach,
  distance_to_entrance, distance_to_exit
 );
 // gl_FragColor = mix(surface_color, vec4(normalize(ray_direction),1), 0.5);
 // return;
 if (!is_interaction) {
  gl_FragColor = vec4(0);
  return;
 } else {
  // gl_FragColor = vec4(1);
  gl_FragColor = mix(surface_color, vec4(normalize(ray_origin),1), 0.5);// surface_color;
 }
 // NOTES:
 // solids are modeled as a gas where attenuation coefficient is super high
 // space is   modeled as a gas where attenuation coefficient is super low
}
`;
fragmentShaders.passthrough = `
uniform sampler2D input_texture;
varying vec2 vUv;
void main() {
 gl_FragColor = texture2D( input_texture, vUv );
}
`;
