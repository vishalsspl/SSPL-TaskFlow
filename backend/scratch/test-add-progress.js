function addProgress(projects) {
  return projects.map(project => {
    try {
      const totalStoryPoints = project.tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
      const completedStoryPoints = project.tasks
        .filter(t => t.status === 'COMPLETED')
        .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

      let progress = 0;
      if (totalStoryPoints > 0) {
        progress = Math.round((completedStoryPoints / totalStoryPoints) * 100);
      } else if (project._count.tasks > 0) {
        const completedTasks = project.tasks.filter(t => t.status === 'COMPLETED').length;
        progress = Math.round((completedTasks / project._count.tasks) * 100);
      }

      const { tasks, ...projectWithoutTasks } = project;
      return { ...projectWithoutTasks, progress };
    } catch (err) {
      console.error('Error in addProgress for project:', project.id, err.message);
      throw err;
    }
  });
}

const mockProjects = [
  {
    id: '1',
    name: 'Test',
    tasks: [],
    _count: { tasks: 0 }
  }
];

try {
  console.log('Testing with empty tasks...');
  addProgress(mockProjects);
  console.log('Success!');
} catch (err) {
  console.log('Failed!');
}

const mockProjects2 = [
  {
    id: '2',
    name: 'Test 2',
    tasks: undefined,
    _count: { tasks: 1 }
  }
];

try {
  console.log('\nTesting with undefined tasks...');
  addProgress(mockProjects2);
  console.log('Success!');
} catch (err) {
  console.log('Failed!');
}
