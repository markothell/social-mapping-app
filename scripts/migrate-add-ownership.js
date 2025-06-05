// scripts/migrate-add-ownership.js
// Migration script to add multi-admin ownership fields to existing activities

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/social-mapping';

// Define the Activity schema (simplified for migration)
const activitySchema = new mongoose.Schema({}, { strict: false });
const Activity = mongoose.model('Activity', activitySchema);

async function migrateActivities() {
  try {
    console.log('🔄 Starting migration to add ownership fields...');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all activities that don't have ownership fields
    const activitiesWithoutOwnership = await Activity.find({
      $or: [
        { ownerId: { $exists: false } },
        { ownerName: { $exists: false } },
        { permissions: { $exists: false } }
      ]
    });

    console.log(`📊 Found ${activitiesWithoutOwnership.length} activities to migrate`);

    if (activitiesWithoutOwnership.length === 0) {
      console.log('✅ No activities need migration');
      return;
    }

    // Migrate each activity
    let migratedCount = 0;
    let errorCount = 0;

    for (const activity of activitiesWithoutOwnership) {
      try {
        const updateFields = {};

        // Add ownerId if missing
        if (!activity.ownerId) {
          updateFields.ownerId = 'teleodelic@gmail.com';
        }

        // Add ownerName if missing
        if (!activity.ownerName) {
          updateFields.ownerName = 'Mo';
        }

        // Add permissions if missing
        if (!activity.permissions) {
          updateFields.permissions = {
            isPublic: true,
            allowGuestParticipants: true,
            visibility: 'public'
          };
        } else {
          // Ensure all permission fields exist
          const permissions = { ...activity.permissions };
          
          if (typeof permissions.isPublic !== 'boolean') {
            permissions.isPublic = true;
          }
          if (typeof permissions.allowGuestParticipants !== 'boolean') {
            permissions.allowGuestParticipants = true;
          }
          if (!permissions.visibility || !['public', 'unlisted', 'private'].includes(permissions.visibility)) {
            permissions.visibility = 'public';
          }
          
          updateFields.permissions = permissions;
        }

        // Update the activity if we have fields to update
        if (Object.keys(updateFields).length > 0) {
          await Activity.updateOne(
            { _id: activity._id },
            { $set: updateFields }
          );
          
          console.log(`✅ Migrated activity: ${activity.id || activity._id}`);
          migratedCount++;
        }

      } catch (error) {
        console.error(`❌ Error migrating activity ${activity.id || activity._id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   Activities processed: ${activitiesWithoutOwnership.length}`);
    console.log(`   Successfully migrated: ${migratedCount}`);
    console.log(`   Errors: ${errorCount}`);

    if (errorCount === 0) {
      console.log('🎉 Migration completed successfully!');
    } else {
      console.log('⚠️  Migration completed with some errors. Please review the logs above.');
    }

  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('📪 Database connection closed');
  }
}

// Verification function to check the migration results
async function verifyMigration() {
  try {
    console.log('\n🔍 Verifying migration results...');
    
    await mongoose.connect(MONGODB_URI);
    
    // Count activities without ownership fields
    const activitiesWithoutOwnership = await Activity.countDocuments({
      $or: [
        { ownerId: { $exists: false } },
        { ownerName: { $exists: false } },
        { permissions: { $exists: false } }
      ]
    });

    // Count total activities
    const totalActivities = await Activity.countDocuments();

    console.log(`📊 Verification Results:`);
    console.log(`   Total activities: ${totalActivities}`);
    console.log(`   Activities without ownership fields: ${activitiesWithoutOwnership}`);
    console.log(`   Activities with ownership fields: ${totalActivities - activitiesWithoutOwnership}`);

    if (activitiesWithoutOwnership === 0) {
      console.log('✅ All activities have ownership fields!');
    } else {
      console.log('⚠️  Some activities still missing ownership fields');
    }

  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await mongoose.connection.close();
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--verify') || args.includes('-v')) {
    await verifyMigration();
  } else if (args.includes('--help') || args.includes('-h')) {
    console.log(`
📋 Multi-Admin Ownership Migration Script

Usage:
  node scripts/migrate-add-ownership.js          Run the migration
  node scripts/migrate-add-ownership.js --verify Verify migration results
  node scripts/migrate-add-ownership.js --help   Show this help

Environment Variables:
  MONGODB_URI                     MongoDB connection string (default: mongodb://localhost:27017/social-mapping)

What this migration does:
  • Adds 'ownerId' field with default value 'teleodelic@gmail.com'
  • Adds 'ownerName' field with default value 'Mo'
  • Adds 'permissions' object with default public settings
  • Ensures backward compatibility with existing activities
  • Does not modify other activity data

Safety:
  • Only updates activities missing ownership fields
  • Uses MongoDB $set operation for safe updates
  • Preserves all existing activity data
  • Can be run multiple times safely (idempotent)
`);
  } else {
    await migrateActivities();
    await verifyMigration();
  }
}

// Handle process termination gracefully
process.on('SIGINT', async () => {
  console.log('\n⏹️  Migration interrupted by user');
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    console.log('📪 Database connection closed');
  }
  process.exit(0);
});

// Run the migration
main().catch((error) => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});