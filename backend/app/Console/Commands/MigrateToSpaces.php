<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class MigrateToSpaces extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:migrate-to-spaces {--delete : Delete local files after successful upload}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Migrate files from local public disk to DO Spaces (s3)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info("Starting migration from 'public' disk to 's3' disk...");
        
        $localDisk = Storage::disk('public');
        $s3Disk = Storage::disk('s3');
        
        // Ensure s3 disk is reachable
        try {
            $s3Disk->exists('test-connection.txt');
        } catch (\Exception $e) {
            $this->error("Failed to connect to S3/DO Spaces. Check your credentials.");
            $this->error($e->getMessage());
            return Command::FAILURE;
        }

        $allFiles = $localDisk->allFiles();
        
        $total = count($allFiles);
        $this->info("Found {$total} files to migrate.");
        
        $bar = $this->output->createProgressBar($total);
        $bar->start();
        
        $successCount = 0;
        $failCount = 0;
        
        foreach ($allFiles as $file) {
            // Skip hidden or explicitly ignored files (e.g., .gitignore)
            if (str_starts_with($file, '.') || str_starts_with(basename($file), '.')) {
                $bar->advance();
                continue;
            }
            
            try {
                $contents = $localDisk->get($file);
                
                // Put file to s3
                $s3Disk->put($file, $contents);
                
                if ($this->option('delete')) {
                    $localDisk->delete($file);
                }
                $successCount++;
            } catch (\Exception $e) {
                $this->error("\nFailed to migrate: {$file}. Error: " . $e->getMessage());
                $failCount++;
            }
            
            $bar->advance();
        }
        
        $bar->finish();
        $this->newLine(2);
        
        $this->info("Migration completed.");
        $this->info("Successfully migrated: {$successCount}");
        if ($failCount > 0) {
            $this->error("Failed to migrate: {$failCount}");
        }
        
        return Command::SUCCESS;
    }
}
