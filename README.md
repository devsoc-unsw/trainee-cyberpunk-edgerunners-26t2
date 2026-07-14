# UNSWager

## Setup
Run
```
npm install
```
then create a .env file and put the environmental variables in there.

## Git Quick Guide
Creating a new branch
```
git checkout -b "<branch-name>"
```

Moving between branches
```
git checkout "<target-branch>"
```

Pulling commits and changes from main branch. ALWAYS DO THIS AT THE START OF YOUR SESSION!
```
git pull origin main
```

The Commit Cycle (You'll always do this for changes you make):
```
git add [.|<file1> <file2 ...] # . or * means to add ALL the files you made changes to since your last commit
git commit -m "<message>"      # make sure the message is descriptive so you have an idea of what happens
git push
```

Merging
When you do git push, there will be a merge link you can click on to create a PR (Pull Request). Always add Avi and Eric as reviewers.
**NEVER** approve your own PRs and **always** merge your own PR once *approved*.

## Supabase
Setting up
```
supabase login
supabase link       # Then select cyberpunk2077 as the project to link to
supabase db pull    # Pull changes made by other people
```
Running locally
```
supabase start
supabase status            # Optional: You can use it to access local dashboard.
supabase status -o json    # Optional: This is done to get your supabase keys for the supabase client to work.
supabase stop --no-backup  # Stopping the db. The --no-backup flag clears cache data. Lowk underrated.
