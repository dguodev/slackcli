import { Command } from 'commander';
import ora from 'ora';
import { getAuthenticatedClient } from '../lib/auth.ts';
import { error } from '../lib/formatter.ts';

export function createActivityCommand(): Command {
  const activity = new Command('activity')
    .description('View your Slack Activity feed (mentions, threads, DMs, reactions)');

  activity
    .command('feed')
    .description('Fetch Activity feed items')
    .option(
      '--mode <mode>',
      'Feed mode: chrono_reads_and_unreads (all) or priority_unreads_v1',
    )
    .option('--types <types>', 'Comma-separated entry types to include')
    .option('--limit <number>', 'Number of items to return', '50')
    .option('--cursor <cursor>', 'Pagination cursor for next page')
    .option('--workspace <id|name>', 'Workspace to use')
    .option('--json', 'Output in JSON format', false)
    .action(async (options) => {
      const spinner = ora('Fetching activity feed...').start();
      try {
        const client = await getAuthenticatedClient(options.workspace);
        const res = await client.getActivityFeed({
          mode: options.mode,
          types: options.types,
          limit: options.limit ? parseInt(options.limit, 10) : undefined,
          cursor: options.cursor,
        });

        const items = res.items || [];
        spinner.succeed(`Found ${items.length} activity items`);

        if (options.json) {
          console.log(
            JSON.stringify(
              {
                item_count: items.length,
                items,
                next_cursor: res.response_metadata?.next_cursor || '',
              },
              null,
              2,
            ),
          );
          return;
        }

        for (const it of items) {
          const unread = it.is_unread ? '●' : ' ';
          const type = it.item?.type ?? 'unknown';
          const ts = it.feed_ts ?? '';
          console.log(`${unread} [${type}] ${ts}`);
        }
      } catch (err: any) {
        spinner.fail('Failed to fetch activity feed');
        error(err.message);
        process.exit(1);
      }
    });

  activity
    .command('views')
    .description('List Activity views/tabs (All, DMs, Mentions, Threads, ...)')
    .option('--workspace <id|name>', 'Workspace to use')
    .option('--json', 'Output in JSON format', false)
    .action(async (options) => {
      const spinner = ora('Fetching activity views...').start();
      try {
        const client = await getAuthenticatedClient(options.workspace);
        const res = await client.getActivityViews();
        const views = res.views || [];
        spinner.succeed(`Found ${views.length} activity views`);

        if (options.json) {
          console.log(JSON.stringify({ view_count: views.length, views }, null, 2));
          return;
        }

        for (const v of views) {
          console.log(`- ${v.name} (${v.view_type})`);
        }
      } catch (err: any) {
        spinner.fail('Failed to fetch activity views');
        error(err.message);
        process.exit(1);
      }
    });

  return activity;
}
