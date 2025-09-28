export const codeTemplates = {
  JavaScript: {
    '3Sum (LeetCode #15)': `function threeSum(nums) {
    // Your code here
    return [];
}`,
    'Product of Array Except Self (LeetCode #238)': `function productExceptSelf(nums) {
    // Your code here
    // Hint: Use prefix and suffix products
    return [];
}`
  },
  Python: {
    '3Sum (LeetCode #15)': `def threeSum(nums):
    # Your code here
    # Hint: Sort the array first, then use two pointers
    return []`,
    'Product of Array Except Self (LeetCode #238)': `def productExceptSelf(nums):
    # Your code here
    # Hint: Use prefix and suffix products
    return []`
  },
  'C++': {
    '3Sum (LeetCode #15)': `#include <vector>
#include <algorithm>
using namespace std;

vector<vector<int>> threeSum(vector<int>& nums) {
    // Your code here
    return {};
}`,
    'Product of Array Except Self (LeetCode #238)': `#include <vector>
using namespace std;

vector<int> productExceptSelf(vector<int>& nums) {
    // Your code here
    // Hint: Use prefix and suffix products
    return {};
}`
  }
};

export const getStarterTemplate = (language: string, problemTitle: string): string => {
  return codeTemplates[language as keyof typeof codeTemplates]?.[problemTitle] || '';
};
