const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/User');
const Incident = require('../models/Incident');

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    await User.deleteMany({});
    await Incident.deleteMany({});
});

describe('Geospatial Query Logic', () => {
    it('should find volunteers within the alerting radius', async () => {
        // 1. Create a volunteer at a specific location
        // Coordinates: [lng, lat]
        const volunteer = await User.create({
            name: 'Nearby Volunteer',
            email: 'nearby@test.com',
            password: 'password123',
            role: 'volunteer',
            isActive: true,
            location: {
                type: 'Point',
                coordinates: [77.5946, 12.9716] // Cubbon Park, Bengaluru
            }
        });

        // 2. Create another volunteer far away
        await User.create({
            name: 'Far Volunteer',
            email: 'far@test.com',
            password: 'password123',
            role: 'volunteer',
            isActive: true,
            location: {
                type: 'Point',
                coordinates: [77.7499, 12.9716] // Whitefield, Bengaluru (~17km away)
            }
        });

        // 3. Define incident location near the first volunteer
        const incidentLoc = {
            lng: 77.5848, // Ashoka Pillar
            lat: 12.9507
        };

        const radius = 5000; // 5km

        // 4. Run the matching query
        const nearbyVolunteers = await User.find({
            role: 'volunteer',
            isActive: true,
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [incidentLoc.lng, incidentLoc.lat]
                    },
                    $maxDistance: radius
                }
            }
        });

        // 5. Verification
        expect(nearbyVolunteers).toHaveLength(1);
        expect(nearbyVolunteers[0].email).toBe('nearby@test.com');
    });

    it('should not find inactive volunteers even if they are nearby', async () => {
        await User.create({
            name: 'Inactive Volunteer',
            email: 'inactive@test.com',
            password: 'password123',
            role: 'volunteer',
            isActive: false,
            location: {
                type: 'Point',
                coordinates: [77.5849, 12.9508]
            }
        });

        const nearbyVolunteers = await User.find({
            role: 'volunteer',
            isActive: true,
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [77.5848, 12.9507]
                    },
                    $maxDistance: 5000
                }
            }
        });

        expect(nearbyVolunteers).toHaveLength(0);
    });
});
