using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Application.DTOs.Requests;
using Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/databases/{databaseId}/tables/{tableName}/columns")]
[Authorize]
public class ColumnController : ControllerBase
{
    private readonly ColumnService _service;

    public ColumnController(ColumnService service)
    {
        _service = service;
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdClaim, out var userId))
            throw new UnauthorizedAccessException("Token không hợp lệ");
        return userId;
    }

    [HttpGet]
    public async Task<ActionResult> GetColumns(int databaseId, string tableName)
    {
        try
        {
            var userId = GetUserId();
            var columns = await _service.GetColumnsAsync(userId, databaseId, tableName);
            return Ok(columns);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost]
    public async Task<ActionResult> AddColumn(int databaseId, string tableName, [FromBody] AddColumnRequest request)
    {
        try
        {
            var userId = GetUserId();
            await _service.AddColumnAsync(userId, databaseId, tableName, request);
            return Ok(new { message = "Thêm cột thành công" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut]
    public async Task<ActionResult> ModifyColumn(int databaseId, string tableName, [FromBody] ModifyColumnRequest request)
    {
        try
        {
            var userId = GetUserId();
            await _service.ModifyColumnAsync(userId, databaseId, tableName, request);
            return Ok(new { message = "Sửa cột thành công" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{columnName}")]
    public async Task<ActionResult> DropColumn(int databaseId, string tableName, string columnName)
    {
        try
        {
            var userId = GetUserId();
            await _service.DropColumnAsync(userId, databaseId, tableName, columnName);
            return NoContent();
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}

